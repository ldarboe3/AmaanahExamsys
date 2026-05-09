import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { getSharedBrowser } from './chromiumHelper';

const FONT_DIR = path.join(process.cwd(), 'fonts');

function loadFontBase64(filename: string): string | null {
  const fp = path.join(FONT_DIR, filename);
  if (!fs.existsSync(fp)) return null;
  return fs.readFileSync(fp).toString('base64');
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

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

const ARABIC_DAYS: Record<string, string> = {
  Saturday: 'السبت',
  Sunday: 'الأحد',
  Monday: 'الاثنين',
  Tuesday: 'الثلاثاء',
  Wednesday: 'الأربعاء',
  Thursday: 'الخميس',
  Friday: 'الجمعة',
};

function arabicDayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const eng = d.toLocaleDateString('en-US', { weekday: 'long' });
  return ARABIC_DAYS[eng] || eng;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtml(opts: TimetablePdfOptions, logoBase64: string | null, qrDataUrl: string | null, fontRegB64: string | null, fontBoldB64: string | null): string {
  const { examYearName, grade, entries } = opts;

  const sortedDates = Array.from(new Set(entries.map(e => e.examDate))).sort();

  const allStartTimes = Array.from(new Set(entries.map(e => e.startTime))).sort();
  const slot1Time = allStartTimes[0] ?? '';
  const slot2Time = allStartTimes[1] ?? '';
  const slot1End = entries.find(e => e.startTime === slot1Time)?.endTime ?? '';
  const slot2End = slot2Time ? (entries.find(e => e.startTime === slot2Time)?.endTime ?? '') : '';

  const s1HeaderAr = `الحصة الأولى ${slot1Time}${slot1End ? ` – ${slot1End}` : ''}`;
  const s2HeaderAr = slot2Time ? `الحصة الثانية ${slot2Time}${slot2End ? ` – ${slot2End}` : ''}` : 'الحصة الثانية';

  const rows = sortedDates.map((date, idx) => {
    const dayEntries = entries.filter(e => e.examDate === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
    const s1Entries = dayEntries.filter(e => e.startTime === slot1Time);
    const s2Entries = slot2Time ? dayEntries.filter(e => e.startTime === slot2Time) : [];

    const s1Text = s1Entries.map(e => esc(e.subjectArabicName || e.subjectName)).join(' / ');
    const s2Text = s2Entries.map(e => esc(e.subjectArabicName || e.subjectName)).join(' / ');
    const bgClass = idx % 2 === 0 ? '' : 'alt';

    return `
      <tr class="${bgClass}">
        <td class="col-day">${esc(arabicDayName(date))}</td>
        <td class="col-date ltr">${esc(fmtDate(date))}</td>
        <td class="col-s1">${s1Text || ''}</td>
        <td class="col-s2">${s2Text || ''}</td>
      </tr>`;
  }).join('');

  const logoTag = logoBase64
    ? `<img src="${logoBase64}" class="logo-img" alt="Logo" />`
    : `<div class="logo-placeholder">أ</div>`;

  const qrTag = qrDataUrl
    ? `<img src="${qrDataUrl}" class="qr-img" alt="QR" />`
    : '';

  const yearStr = examYearName.split('/')[0] || '2026';

  const NOTES = [
    'يوم الثلاثاء الموافق 16 لا يوجد فيه امتحان.',
    'يرجى من الجميع الالتزام بالوقت المحدد في الجدول.',
    'لا يُسمح لأي طالب بالمشاركة في الامتحان إلا بعد دفع الرسوم امتحان كاملاً.',
    'يجب على كل طالب أن يكون في قاعة الامتحان قبل الموعد المحدد بخمس عشرة دقيقة.',
    'لا يُسمح لأي طالب بالجلوس في القاعة دون ارتداء زي المدرسة.',
  ];

  const notesHtml = NOTES.map((n, i) => `<p class="note-line">${i + 1}. ${esc(n)}</p>`).join('');

  const fontFaceCSS = (fontRegB64 && fontBoldB64) ? `
    @font-face {
      font-family: 'Amiri';
      font-weight: 400;
      src: url('data:font/truetype;base64,${fontRegB64}') format('truetype');
    }
    @font-face {
      font-family: 'Amiri';
      font-weight: 700;
      src: url('data:font/truetype;base64,${fontBoldB64}') format('truetype');
    }
  ` : '';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  ${fontFaceCSS}

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Amiri', 'Noto Naskh Arabic', 'Arial', sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    direction: rtl;
    background: #fff;
    width: 210mm;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 8mm 10mm;
    background: #fff;
  }

  /* ── HEADER ─────────────────────────────────────── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 5mm;
    border-bottom: 0.5px solid #ccc;
    margin-bottom: 3mm;
    direction: ltr;
  }
  .header-left {
    text-align: left;
    width: 46mm;
  }
  .header-left .org-name {
    font-weight: 700;
    font-size: 11px;
    color: #1a1a1a;
    line-height: 1.5;
  }
  .header-left .email {
    font-size: 9px;
    color: #1565c0;
    margin-top: 2px;
  }
  .header-center {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22mm;
  }
  .logo-img {
    width: 18mm;
    height: 18mm;
    object-fit: contain;
  }
  .logo-placeholder {
    width: 16mm;
    height: 16mm;
    border-radius: 50%;
    background: #0d7a45;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 700;
  }
  .header-right {
    text-align: right;
    direction: rtl;
    width: 46mm;
  }
  .header-right .org-ar {
    font-weight: 700;
    font-size: 12px;
    line-height: 1.6;
    color: #1a1a1a;
  }
  .header-right .email-ar {
    font-size: 9px;
    color: #1565c0;
    margin-top: 2px;
    direction: ltr;
    text-align: right;
  }

  /* ── GREEN BANNER ───────────────────────────────── */
  .banner {
    background: #0d7a45;
    color: #fff;
    display: flex;
    align-items: center;
    height: 16mm;
    margin-bottom: 0;
    direction: ltr;
    position: relative;
  }
  .banner-year {
    background: #cc0000;
    min-width: 22mm;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 700;
    color: #fff;
    font-family: 'Arial', sans-serif;
    flex-shrink: 0;
  }
  .banner-title {
    flex: 1;
    text-align: center;
    font-size: 26px;
    font-weight: 700;
    direction: rtl;
    padding: 0 4mm;
  }
  .banner-qr {
    width: 14mm;
    height: 14mm;
    margin: 0 2mm;
    flex-shrink: 0;
  }

  /* ── AMBER TITLE BAR ────────────────────────────── */
  .title-bar {
    background: #f5d96a;
    border-top: 2px solid #c8960c;
    border-bottom: 2px solid #c8960c;
    text-align: center;
    padding: 2.5mm 4mm;
    direction: rtl;
    margin-bottom: 3mm;
  }
  .title-bar .schedule-title {
    font-size: 16px;
    font-weight: 700;
    color: #1a1a1a;
  }

  /* ── TABLE ──────────────────────────────────────── */
  table {
    width: 100%;
    border-collapse: collapse;
    direction: rtl;
    margin-bottom: 5mm;
  }
  thead tr {
    background: #1a7a4a;
    color: #fff;
  }
  thead th {
    padding: 4mm 3mm;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
    border: 0.5px solid #0d7a45;
    direction: rtl;
  }
  tbody tr { background: #fff; }
  tbody tr.alt { background: #e8f5ee; }
  tbody td {
    padding: 3.5mm 3mm;
    font-size: 12.5px;
    text-align: center;
    border: 0.5px solid #c8c8c8;
    direction: rtl;
    vertical-align: middle;
    line-height: 1.6;
  }
  .col-day { width: 15%; font-weight: 700; }
  .col-date { width: 18%; }
  .col-s1 { width: 33.5%; }
  .col-s2 { width: 33.5%; }
  .ltr { direction: ltr; }

  /* ── NOTES ──────────────────────────────────────── */
  .notes-section {
    direction: rtl;
    margin-bottom: 4mm;
  }
  .notes-label {
    font-weight: 700;
    font-size: 14px;
    margin-bottom: 2mm;
    text-align: right;
  }
  .notes-body {
    display: flex;
    align-items: flex-start;
    gap: 4mm;
    direction: rtl;
  }
  .notes-qr {
    width: 22mm;
    height: 22mm;
    flex-shrink: 0;
  }
  .notes-text { flex: 1; }
  .note-line {
    font-size: 11.5px;
    line-height: 1.8;
    text-align: right;
  }

  /* ── DEADLINE ───────────────────────────────────── */
  .deadline {
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    color: #cc0000;
    direction: rtl;
    margin-bottom: 2mm;
  }
  .payment-note {
    text-align: center;
    font-size: 11px;
    color: #1a1a1a;
    direction: rtl;
    margin-bottom: 4mm;
  }

  /* ── BANK BOXES ─────────────────────────────────── */
  .bank-row {
    display: flex;
    gap: 5mm;
    direction: ltr;
    margin-bottom: 4mm;
  }
  .bank-box {
    flex: 1;
    background: #f2f2f2;
    border: 0.5px solid #c0c0c0;
    padding: 3mm;
    text-align: center;
  }
  .bank-label {
    font-size: 10px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 2mm;
  }
  .bank-number {
    font-size: 18px;
    font-weight: 700;
    color: #1565c0;
    margin-bottom: 2mm;
    font-family: 'Arial', sans-serif;
  }
  .bank-name {
    font-size: 9.5px;
    color: #444;
  }

  /* ── FOOTER ─────────────────────────────────────── */
  .footer {
    text-align: center;
    font-size: 8.5px;
    color: #777;
    border-top: 0.5px solid #e5e7eb;
    padding-top: 2mm;
    direction: ltr;
  }

  /* ── WATERMARK ──────────────────────────────────── */
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-38deg);
    font-size: 54px;
    font-weight: 700;
    color: rgba(0,0,0,0.045);
    white-space: nowrap;
    pointer-events: none;
    font-family: 'Arial', sans-serif;
    z-index: 0;
  }

  @media print {
    @page { size: A4; margin: 0; }
    body { width: 210mm; }
    .page { padding: 8mm 10mm; }
  }
</style>
</head>
<body>
<div class="watermark">OSIAE/AMAANAH</div>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <div class="org-name">The General Secretariat for Islamic/Arabic<br>Education in the Gambia</div>
      <div class="email">amaanahexamnation@gmail.com</div>
    </div>
    <div class="header-center">${logoTag}</div>
    <div class="header-right">
      <div class="org-ar">الأمانة العامة للتعليم الإسلامي العربي غامبيا</div>
      <div class="email-ar">amaanahexamnation@gmail.com</div>
    </div>
  </div>

  <!-- GREEN BANNER -->
  <div class="banner">
    <div class="banner-year">-${esc(yearStr)}</div>
    <div class="banner-title">إدارة الامتحانات</div>
    ${qrTag ? `<img src="${qrDataUrl ?? ''}" class="banner-qr" alt="QR"/>` : ''}
  </div>

  <!-- AMBER TITLE BAR -->
  <div class="title-bar">
    <div class="schedule-title">جدول اختبارات الشهادة الابتدائية – العام الدراسي ${esc(examYearName)}</div>
    <div class="schedule-title" style="font-size:14px; direction:ltr; margin-top:2px;">Examination ${esc(examYearName)}</div>
  </div>

  <!-- TABLE -->
  <table>
    <thead>
      <tr>
        <th class="col-day">الأيام</th>
        <th class="col-date">التاريخ</th>
        <th class="col-s1">${esc(s1HeaderAr)}</th>
        <th class="col-s2">${esc(s2HeaderAr)}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <!-- NOTES -->
  <div class="notes-section">
    <div class="notes-label">:ملاحظة</div>
    <div class="notes-body">
      <div class="notes-text">${notesHtml}</div>
      ${qrTag ? `<img src="${qrDataUrl ?? ''}" class="notes-qr" alt="QR"/>` : ''}
    </div>
  </div>

  <!-- DEADLINE -->
  <div class="deadline">!!! الموعد الأخير لدفع رسوم الامتحانات 2026/05/15</div>
  <div class="payment-note">يرجى من جميع المديرين دفع رسوم الامتحانات في حساب قسم الامتحانات التابع للأمانة في البنوك الآتية:</div>

  <!-- BANK DETAILS -->
  <div class="bank-row">
    <div class="bank-box">
      <div class="bank-label">ACCOUNT NUMBER</div>
      <div class="bank-number">10101010003124</div>
      <div class="bank-name">Name : Amaanah Examination</div>
    </div>
    <div class="bank-box">
      <div class="bank-label">ACCOUNT NUMBER</div>
      <div class="bank-number">1020000464</div>
      <div class="bank-name">Name : Amaanah Examination</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    Tel/Fax: (00220) 7554613/3681104/3020699/3772086/3707626 &nbsp;|&nbsp; Email: amaahaecertificate2023@gmail.com<br/>
    <span style="color:#aaa;">Developed by Sky Innovation Hub</span>
  </div>

</div>
</body>
</html>`;
}

export async function generateTimetablePdf(opts: TimetablePdfOptions): Promise<Buffer> {
  // ── Logo ──────────────────────────────────────────────────────────────────
  const logoPath = path.join(process.cwd(), 'attached_assets/Amana_Logo_1770390631299.jpeg');
  let logoBase64: string | null = null;
  if (fs.existsSync(logoPath)) {
    const buf = fs.readFileSync(logoPath);
    const mime = logoPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    logoBase64 = `data:${mime};base64,${buf.toString('base64')}`;
  }

  // ── QR code ───────────────────────────────────────────────────────────────
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL('https://amaanah.examinations.gm', { width: 90, margin: 1 });
  } catch {}

  const fontRegB64 = loadFontBase64('Amiri-Regular.ttf');
  const fontBoldB64 = loadFontBase64('Amiri-Bold.ttf');

  const html = buildHtml(opts, logoBase64, qrDataUrl, fontRegB64, fontBoldB64);

  // ── Puppeteer render ──────────────────────────────────────────────────────
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}
