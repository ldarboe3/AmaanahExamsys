import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { shapeArabicText } from './arabicTextHelper';

const A4_W = 595.28;
const A4_H = 841.89;
const MX = 36;
const MY = 22;

const GREEN_DARK  = '#0D7A45';
const GREEN_TABLE = '#1A7A4A';
const RED_ACCENT  = '#CC0000';
const AMBER       = '#C8960C';
const AMBER_BG    = '#F5D96A';
const WHITE       = '#FFFFFF';
const DARK        = '#1A1A1A';
const LIGHT_GREEN = '#E8F5EE';
const BLUE        = '#1565C0';
const GRAY_LIGHT  = '#F2F2F2';

const AMIRI_BOLD = path.resolve(process.cwd(), 'fonts', 'Amiri-Bold.ttf');
const AMIRI_REG  = path.resolve(process.cwd(), 'fonts', 'Amiri-Regular.ttf');

function ar(text: string): string {
  if (!text) return '';
  try { return shapeArabicText(text); } catch { return text; }
}

const ARABIC_DAYS: Record<string, string> = {
  Saturday:  'السبت',
  Sunday:    'الأحد',
  Monday:    'الاثنين',
  Tuesday:   'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday:  'الخميس',
  Friday:    'الجمعة',
};

function arabicDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const eng = d.toLocaleDateString('en-US', { weekday: 'long' });
  return ARABIC_DAYS[eng] || eng;
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

export interface TimetablePdfEntry {
  examDate: string;
  startTime: string;
  endTime: string;
  subjectName: string;
  subjectArabicName?: string | null;
  grade: number;
  isCore?: boolean | null;
}

export interface TimetablePdfOptions {
  examYearName: string;
  grade: number | null;
  entries: TimetablePdfEntry[];
}

export async function generateTimetablePdf(opts: TimetablePdfOptions): Promise<Buffer> {
  const { examYearName, grade, entries } = opts;
  const hasAmiri = fs.existsSync(AMIRI_BOLD) && fs.existsSync(AMIRI_REG);

  let qrBuffer: Buffer | null = null;
  try { qrBuffer = await QRCode.toBuffer('https://amaanah.examinations.gm', { width: 90, margin: 1 }); } catch {}

  const logoPath = path.join(process.cwd(), 'attached_assets/Amana_Logo_1770390631299.jpeg');
  const logoBuffer = fs.existsSync(logoPath) ? fs.readFileSync(logoPath) : null;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, layout: 'portrait' });

    if (hasAmiri) {
      doc.registerFont('A', AMIRI_REG);
      doc.registerFont('AB', AMIRI_BOLD);
    }

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = A4_W;
    const contentW = W - MX * 2;

    // ────────────────────────────────────────────────────────────────────
    // WATERMARK
    // ────────────────────────────────────────────────────────────────────
    doc.save();
    doc.opacity(0.045);
    doc.font(hasAmiri ? 'AB' : 'Helvetica-Bold').fontSize(54);
    const wmStr = 'OSIAE/AMAANAH';
    const wmW = doc.widthOfString(wmStr);
    doc.translate(W / 2, A4_H / 2).rotate(-38);
    doc.fillColor('#000000').text(wmStr, -wmW / 2, -27);
    doc.restore();

    let y = MY;

    // ────────────────────────────────────────────────────────────────────
    // HEADER — bilingual
    // ────────────────────────────────────────────────────────────────────
    const hdrH = 70;
    const sideW = 175;
    const centerLogoW = 72;
    const centerLogoX = W / 2 - centerLogoW / 2;

    // Left: English
    doc.font(hasAmiri ? 'AB' : 'Helvetica-Bold').fontSize(7.5).fillColor(DARK);
    doc.text('The General Secretariat for Islamic/Arabic', MX, y + 3, { width: sideW, align: 'left' });
    doc.text('Education in the Gambia', MX, y + 14, { width: sideW, align: 'left' });
    doc.font(hasAmiri ? 'A' : 'Helvetica').fillColor(BLUE).fontSize(7);
    doc.text('amaanahexamnation@gmail.com', MX, y + 28, { width: sideW, align: 'left' });

    // Center logo
    if (logoBuffer) {
      doc.image(logoBuffer, centerLogoX, y, { width: centerLogoW, height: centerLogoW });
    }

    // Right: Arabic
    const rightX = W - MX - sideW;
    doc.font(hasAmiri ? 'AB' : 'Helvetica-Bold').fontSize(8).fillColor(DARK);
    doc.text(ar('الأمانة العامة للتعليم الإسلامي العربي غامبيا'), rightX, y + 3, { width: sideW, align: 'right' });
    doc.font(hasAmiri ? 'A' : 'Helvetica').fillColor(BLUE).fontSize(7);
    doc.text('amaanahexamnation@gmail.com', rightX, y + 25, { width: sideW, align: 'right' });

    // Divider line under header
    y += hdrH - 4;
    doc.strokeColor('#CCCCCC').lineWidth(0.7).moveTo(MX, y).lineTo(MX + contentW, y).stroke();

    y += 6;

    // ────────────────────────────────────────────────────────────────────
    // GREEN BANNER
    // ────────────────────────────────────────────────────────────────────
    const bannerH = 48;
    doc.rect(MX, y, contentW, bannerH).fill(GREEN_DARK);

    // Left red strip with year highlight
    const yearStr = examYearName.split('/')[0] || '2026';
    doc.rect(MX, y, 60, bannerH).fill(RED_ACCENT);
    doc.font(hasAmiri ? 'AB' : 'Helvetica-Bold').fontSize(20).fillColor(WHITE);
    doc.text(`-${yearStr}`, MX + 2, y + 12, { width: 56, align: 'center' });

    // Center main Arabic title
    const bannerInnerX = MX + 62;
    const bannerInnerW = contentW - 62 - (qrBuffer ? 58 : 6);
    doc.font(hasAmiri ? 'AB' : 'Helvetica-Bold').fontSize(22).fillColor(WHITE);
    doc.text(ar('إدارة الامتحانات'), bannerInnerX, y + 11, { width: bannerInnerW, align: 'center' });

    // Right QR in banner
    if (qrBuffer) {
      doc.image(qrBuffer, MX + contentW - 54, y + 4, { width: 40, height: 40 });
    }

    y += bannerH + 2;

    // ────────────────────────────────────────────────────────────────────
    // TITLE BAR (amber)
    // ────────────────────────────────────────────────────────────────────
    const titleBarH = 36;
    doc.rect(MX, y, contentW, titleBarH).fill(AMBER_BG);
    doc.rect(MX, y, contentW, 2).fill(AMBER);
    doc.rect(MX, y + titleBarH - 2, contentW, 2).fill(AMBER);

    const gradeAr = grade === 6 ? 'السادس' : grade ? `${grade}` : 'جميع الصفوف';
    const titleAr = ar(`جدول اختبارات الشهادة الابتدائية – العام الدراسي ${examYearName}`);
    doc.font(hasAmiri ? 'AB' : 'Helvetica-Bold').fontSize(13).fillColor(DARK);
    doc.text(titleAr, MX + 8, y + 11, { width: contentW - 16, align: 'center' });

    y += titleBarH + 4;

    // ────────────────────────────────────────────────────────────────────
    // TABLE
    // ────────────────────────────────────────────────────────────────────
    // Group entries by date, find distinct time slots
    const sortedDates = Array.from(new Set(entries.map(e => e.examDate))).sort();

    // Determine the two session time ranges
    const allStartTimes = Array.from(new Set(entries.map(e => e.startTime))).sort();
    const slot1Time = allStartTimes[0];
    const slot2Time = allStartTimes[1];
    const slot1End = entries.find(e => e.startTime === slot1Time)?.endTime || '';
    const slot2End = entries.find(e => e.startTime === slot2Time)?.endTime || '';

    // Physical column layout (RTL document — rightmost = Day, leftmost = Session 2)
    const COL_DAY  = 64;
    const COL_DATE = 72;
    const COL_S1   = Math.floor((contentW - COL_DAY - COL_DATE) / 2);
    const COL_S2   = contentW - COL_DAY - COL_DATE - COL_S1;

    // Physical x positions from LEFT edge (Arabic RTL → rightmost col = Day)
    const xS2   = MX;                                    // leftmost (Session 2)
    const xS1   = MX + COL_S2;                           // Session 1
    const xDate = MX + COL_S2 + COL_S1;                  // Date
    const xDay  = MX + COL_S2 + COL_S1 + COL_DATE;       // rightmost (Day name)

    const ROW_H = 27;

    // Header row
    doc.rect(MX, y, contentW, ROW_H).fill(GREEN_TABLE);

    const s1HeaderAr = ar(`الحصة الأولى ${slot1Time}${slot1End ? ` – ${slot1End}` : ''}`);
    const s2HeaderAr = ar(`الحصة الثانية ${slot2Time || ''}${slot2End ? ` – ${slot2End}` : ''}`);

    doc.font(hasAmiri ? 'AB' : 'Helvetica-Bold').fontSize(9).fillColor(WHITE);
    // Day header (rightmost)
    doc.text(ar('الأيام'), xDay, y + 9, { width: COL_DAY, align: 'center' });
    // Date header
    doc.text(ar('التاريخ'), xDate, y + 9, { width: COL_DATE, align: 'center' });
    // Session 1 header
    doc.text(s1HeaderAr, xS1, y + 9, { width: COL_S1, align: 'center' });
    // Session 2 header
    if (slot2Time) {
      doc.text(s2HeaderAr, xS2, y + 9, { width: COL_S2, align: 'center' });
    } else {
      doc.text(ar('الحصة الثانية'), xS2, y + 9, { width: COL_S2, align: 'center' });
    }

    y += ROW_H;

    // Data rows
    let rowIdx = 0;
    const tableStartY = y;

    for (const date of sortedDates) {
      const dayEntries = entries.filter(e => e.examDate === date).sort((a,b) => a.startTime.localeCompare(b.startTime));
      const s1Entries = dayEntries.filter(e => e.startTime === slot1Time);
      const s2Entries = slot2Time ? dayEntries.filter(e => e.startTime === slot2Time) : [];

      const s1Text = s1Entries.map(e => e.subjectArabicName || e.subjectName).join(' / ');
      const s2Text = s2Entries.map(e => e.subjectArabicName || e.subjectName).join(' / ');

      const bg = rowIdx % 2 === 0 ? WHITE : LIGHT_GREEN;
      doc.rect(MX, y, contentW, ROW_H).fill(bg);

      // Subtle horizontal divider
      doc.strokeColor('#C8C8C8').lineWidth(0.4);
      doc.moveTo(MX, y + ROW_H).lineTo(MX + contentW, y + ROW_H).stroke();

      // Vertical dividers
      [xS1, xDate, xDay].forEach(vx => {
        doc.moveTo(vx, y).lineTo(vx, y + ROW_H).stroke();
      });

      // Day name (bold, rightmost)
      doc.font(hasAmiri ? 'AB' : 'Helvetica-Bold').fontSize(10).fillColor(DARK);
      doc.text(ar(arabicDayName(date)), xDay, y + 8, { width: COL_DAY, align: 'center' });

      // Date
      doc.font(hasAmiri ? 'A' : 'Helvetica').fontSize(9).fillColor(DARK);
      doc.text(fmtDate(date), xDate, y + 9, { width: COL_DATE, align: 'center' });

      // Session 1
      if (s1Text) {
        doc.font(hasAmiri ? 'A' : 'Helvetica').fontSize(9.5).fillColor(DARK);
        doc.text(ar(s1Text), xS1 + 3, y + 8, { width: COL_S1 - 6, align: 'center' });
      }

      // Session 2
      if (s2Text) {
        doc.font(hasAmiri ? 'A' : 'Helvetica').fontSize(9.5).fillColor(DARK);
        doc.text(ar(s2Text), xS2 + 3, y + 8, { width: COL_S2 - 6, align: 'center' });
      }

      y += ROW_H;
      rowIdx++;
    }

    // Table outer border
    const tableH = ROW_H + rowIdx * ROW_H;
    doc.rect(MX, tableStartY - ROW_H, contentW, tableH).stroke();

    y += 14;

    // ────────────────────────────────────────────────────────────────────
    // NOTES SECTION
    // ────────────────────────────────────────────────────────────────────
    const notesQrSize = 78;

    // Notes label
    doc.font(hasAmiri ? 'AB' : 'Helvetica-Bold').fontSize(11).fillColor(DARK);
    doc.text(ar(':ملاحظة'), MX, y, { width: contentW, align: 'right' });
    y += 16;

    const NOTES = [
      'يوم الثلاثاء الموافق 16 لا يوجد فيه امتحان.',
      'يرجى من الجميع الالتزام بالوقت المحدد في الجدول.',
      'لا يُسمح لأي طالب بالمشاركة في الامتحان إلا بعد دفع الرسوم امتحان كاملاً.',
      'يجب على كل طالب أن يكون في قاعة الامتحان قبل الموعد المحدد بخمس عشرة دقيقة.',
      'لا يُسمح لأي طالب بالجلوس في القاعة دون ارتداء زي المدرسة.',
    ];

    const noteStartY = y;

    doc.font(hasAmiri ? 'A' : 'Helvetica').fontSize(9).fillColor(DARK);
    for (let i = 0; i < NOTES.length; i++) {
      const noteAr = ar(`${i + 1}. ${NOTES[i]}`);
      doc.text(noteAr, MX + notesQrSize + 12, y, { width: contentW - notesQrSize - 12, align: 'right' });
      y += 16;
    }

    // QR code (left of notes)
    if (qrBuffer) {
      doc.image(qrBuffer, MX, noteStartY, { width: notesQrSize, height: notesQrSize });
    }

    y = Math.max(y, noteStartY + notesQrSize + 4);
    y += 8;

    // Deadline notice
    doc.font(hasAmiri ? 'AB' : 'Helvetica-Bold').fontSize(10).fillColor(RED_ACCENT);
    doc.text(ar(`!!! الموعد الأخير لدفع رسوم الامتحانات 2026/05/15`), MX, y, { width: contentW, align: 'center' });
    y += 16;

    doc.font(hasAmiri ? 'A' : 'Helvetica').fontSize(9).fillColor(DARK);
    doc.text(
      ar('يرجى من جميع المديرين دفع رسوم الامتحانات في حساب قسم الامتحانات التابع للأمانة في البنوك الآتية:'),
      MX, y, { width: contentW, align: 'center' }
    );
    y += 18;

    // ────────────────────────────────────────────────────────────────────
    // BANK DETAILS
    // ────────────────────────────────────────────────────────────────────
    const bankH = 54;
    const bankGap = 18;
    const bankW = (contentW - bankGap) / 2;

    const drawBank = (bx: number, acctNum: string, bankTag: string) => {
      doc.rect(bx, y, bankW, bankH).fill(GRAY_LIGHT);
      doc.rect(bx, y, bankW, bankH).stroke('#C0C0C0');
      doc.font(hasAmiri ? 'AB' : 'Helvetica-Bold').fontSize(8).fillColor(DARK);
      doc.text('ACCOUNT NUMBER', bx + 8, y + 7, { width: bankW - 16, align: 'center' });
      doc.font(hasAmiri ? 'AB' : 'Helvetica-Bold').fontSize(15).fillColor(BLUE);
      doc.text(acctNum, bx + 8, y + 20, { width: bankW - 16, align: 'center' });
      doc.font(hasAmiri ? 'A' : 'Helvetica').fontSize(7.5).fillColor('#444444');
      doc.text('Name : Amaanah Examination', bx + 8, y + 38, { width: bankW - 16, align: 'center' });
    };

    drawBank(MX, '10101010003124', 'Agib');
    drawBank(MX + bankW + bankGap, '1020000464', 'Yo');

    y += bankH + 12;

    // ────────────────────────────────────────────────────────────────────
    // FOOTER
    // ────────────────────────────────────────────────────────────────────
    doc.font(hasAmiri ? 'A' : 'Helvetica').fontSize(6.5).fillColor('#777777');
    doc.text(
      'Tel/Fax: (00220) 7554613/3681104/3020699/3772086/3707626    Email: amaahaecertificate2023@gmail.com',
      MX, y, { width: contentW, align: 'center' }
    );

    y += 13;
    doc.fontSize(6.5).fillColor('#AAAAAA');
    doc.text('Developed by SkyNet Innovation Hub', MX, y, { width: contentW, align: 'center' });

    doc.end();
  });
}
