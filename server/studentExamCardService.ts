import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
const bwipjs = require('bwip-js');

const FONT_REGULAR = path.resolve(process.cwd(), 'fonts', 'Amiri-Regular.ttf');
const FONT_BOLD = path.resolve(process.cwd(), 'fonts', 'Amiri-Bold.ttf');

const MM_TO_PT = 2.8346;
const CARD_W_MM = 54;
const CARD_H_MM = 85.6;
const W = Math.round(CARD_W_MM * MM_TO_PT);
const H = Math.round(CARD_H_MM * MM_TO_PT);

const GREEN_DARK = '#0A5C36';
const GREEN_MID = '#0D8A50';
const GREEN_LIGHT = '#2BAF6E';
const WHITE = '#FFFFFF';
const DARK = '#1A1A1A';
const GRAY = '#555555';
const LIGHT_GRAY = '#888888';

interface StudentCardData {
  indexNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  grade: number;
  gender: string;
  schoolName: string;
  schoolAddress?: string | null;
  examYearName: string;
  verifyUrl: string;
}

let logoBuffer: Buffer | null = null;
function getLogoBuffer(): Buffer | null {
  if (logoBuffer) return logoBuffer;
  try {
    const logoPath = path.join(process.cwd(), 'attached_assets/Amana_Logo_1770390631299.jpeg');
    if (fs.existsSync(logoPath)) {
      logoBuffer = fs.readFileSync(logoPath);
      return logoBuffer;
    }
  } catch {}
  return null;
}

async function generateBarcodePng(text: string): Promise<Buffer | null> {
  if (!text) return null;
  try {
    return await bwipjs.toBuffer({
      bcid: 'code128',
      text: text,
      scale: 2,
      height: 8,
      includetext: false,
      backgroundcolor: 'FFFFFF',
    });
  } catch {
    return null;
  }
}

function drawFrontPage(doc: typeof PDFDocument, data: StudentCardData, hasAmiri: boolean, barcodeBuffer: Buffer | null, qrBuffer: Buffer | null) {
  doc.save();
  doc.roundedRect(0, 0, W, H, 6).clip();

  doc.rect(0, 0, W, H * 0.35).fill(GREEN_DARK);

  doc.rect(0, H * 0.35, W, H * 0.65).fill(WHITE);

  doc.save();
  doc.rect(0, H * 0.31, W, H * 0.08);
  const grad1 = doc.linearGradient(0, H * 0.31, 0, H * 0.39);
  grad1.stop(0, GREEN_DARK);
  grad1.stop(1, WHITE);
  doc.fill(grad1);
  doc.restore();

  doc.lineWidth(0.5)
    .strokeColor(GREEN_MID)
    .moveTo(8, H * 0.31)
    .lineTo(W - 8, H * 0.31)
    .stroke();

  const logo = getLogoBuffer();
  if (logo) {
    try {
      const logoSize = 28;
      const logoX = (W - logoSize) / 2;
      const logoY = 6;
      doc.save();
      doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2).fill(WHITE);
      doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2).clip();
      doc.image(logo, logoX, logoY, { width: logoSize, height: logoSize });
      doc.restore();
    } catch {}
  }

  const titleFont = hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold';
  const regularFont = hasAmiri ? 'Amiri' : 'Helvetica';

  doc.font(titleFont)
    .fontSize(8)
    .fillColor(WHITE)
    .text('AMAANAH', 0, 37, { width: W, align: 'center' });

  doc.font(regularFont)
    .fontSize(5.5)
    .fillColor('#B0E0C8')
    .text('Islamic Education Trust', 0, 47, { width: W, align: 'center' });

  doc.save();
  const pillW = W * 0.75;
  const pillH = 15;
  const pillX = (W - pillW) / 2;
  const pillY = 56;
  doc.roundedRect(pillX, pillY, pillW, pillH, 3).fill(GREEN_LIGHT);
  doc.font(titleFont)
    .fontSize(7)
    .fillColor(WHITE)
    .text('EXAMINATION CARD', 0, pillY + 3, { width: W, align: 'center' });
  doc.restore();

  doc.font(titleFont)
    .fontSize(5.5)
    .fillColor('#C0E8D0')
    .text(data.examYearName, 0, 74, { width: W, align: 'center' });

  const infoStartY = H * 0.37;
  const labelX = 10;
  const valueX = 10;
  const lineHeight = 15;
  let currentY = infoStartY;

  const drawField = (label: string, value: string) => {
    doc.font(regularFont)
      .fontSize(5.5)
      .fillColor(LIGHT_GRAY)
      .text(label, labelX, currentY, { width: W - 20 });
    doc.font(titleFont)
      .fontSize(7)
      .fillColor(DARK)
      .text(value, valueX, currentY + 7, { width: W - 20 });
    currentY += lineHeight;
  };

  const fullName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ');
  drawField('CANDIDATE NAME', fullName);

  doc.save();
  const idxPillW = W - 20;
  const idxPillH = 24;
  const idxPillX = 10;
  const idxPillY = currentY;
  doc.roundedRect(idxPillX, idxPillY, idxPillW, idxPillH, 4)
    .fillAndStroke('#F0FAF4', GREEN_MID);
  doc.font(regularFont)
    .fontSize(5)
    .fillColor(GRAY)
    .text('INDEX NUMBER', idxPillX + 8, idxPillY + 3);
  doc.font(titleFont)
    .fontSize(13)
    .fillColor(GREEN_DARK)
    .text(data.indexNumber, idxPillX + 8, idxPillY + 10);
  doc.restore();
  currentY += idxPillH + 4;

  const gradeStr = data.grade === 6 ? 'Grade 6' : data.grade === 9 ? 'Grade 9' : `Grade ${data.grade}`;
  drawField('CLASS / GRADE', gradeStr);
  drawField('GENDER', data.gender === 'male' ? 'Male' : 'Female');
  drawField('SCHOOL', data.schoolName);
  if (data.schoolAddress) {
    drawField('ADDRESS', data.schoolAddress);
  }

  if (barcodeBuffer) {
    try {
      const bcW = W * 0.65;
      const bcH = 14;
      const bcX = (W - bcW) / 2;
      const bcY = H - 20;
      doc.image(barcodeBuffer, bcX, bcY, { width: bcW, height: bcH });
    } catch {}
  }

  doc.restore();
}

function drawBackPage(doc: typeof PDFDocument, data: StudentCardData, hasAmiri: boolean, barcodeBuffer: Buffer | null, qrBuffer: Buffer | null) {
  doc.save();
  doc.roundedRect(0, 0, W, H, 6).clip();

  doc.rect(0, 0, W, H).fill(GREEN_DARK);

  doc.rect(0, H * 0.82, W, H * 0.18).fill('#073D24');

  const titleFont = hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold';
  const regularFont = hasAmiri ? 'Amiri' : 'Helvetica';

  doc.font(titleFont)
    .fontSize(7)
    .fillColor(WHITE)
    .text('AMAANAH', 0, 10, { width: W, align: 'center' });

  doc.font(regularFont)
    .fontSize(5)
    .fillColor('#B0E0C8')
    .text('Examination Card', 0, 19, { width: W, align: 'center' });

  doc.lineWidth(0.3)
    .strokeColor(GREEN_LIGHT)
    .moveTo(15, 28)
    .lineTo(W - 15, 28)
    .stroke();

  if (qrBuffer) {
    try {
      const qrSize = 75;
      const qrX = (W - qrSize) / 2;
      const qrY = 35;

      doc.save();
      doc.roundedRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8, 4).fill(WHITE);
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      doc.restore();

      doc.font(regularFont)
        .fontSize(4.5)
        .fillColor('#B0E0C8')
        .text('Scan to verify', 0, qrY + qrSize + 6, { width: W, align: 'center' });
    } catch {}
  }

  const rulesY = H * 0.55;
  doc.font(titleFont)
    .fontSize(6)
    .fillColor(WHITE)
    .text('INSTRUCTIONS', 0, rulesY, { width: W, align: 'center' });

  doc.lineWidth(0.3)
    .strokeColor(GREEN_LIGHT)
    .moveTo(30, rulesY + 9)
    .lineTo(W - 30, rulesY + 9)
    .stroke();

  const rules = [
    'Present this card at all exams',
    'Report any damage immediately',
    'Non-transferable',
    'Valid for current exam year only',
  ];

  let ruleY = rulesY + 15;
  rules.forEach((rule) => {
    doc.font(regularFont)
      .fontSize(5)
      .fillColor('#C0E8D0')
      .text(`•  ${rule}`, 12, ruleY, { width: W - 24 });
    ruleY += 10;
  });

  if (barcodeBuffer) {
    try {
      const bcW = W * 0.55;
      const bcH = 12;
      const bcX = (W - bcW) / 2;
      const bcY = H - 28;

      doc.save();
      doc.roundedRect(bcX - 3, bcY - 2, bcW + 6, bcH + 4, 2).fill(WHITE);
      doc.image(barcodeBuffer, bcX, bcY, { width: bcW, height: bcH });
      doc.restore();

      doc.font(regularFont)
        .fontSize(4.5)
        .fillColor('#90C8A8')
        .text(data.indexNumber, 0, bcY + bcH + 3, { width: W, align: 'center' });
    } catch {}
  }

  doc.restore();
}

export async function generateStudentExamCard(data: StudentCardData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [W, H],
        margin: 0,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const hasAmiri = fs.existsSync(FONT_BOLD) && fs.existsSync(FONT_REGULAR);
      if (hasAmiri) {
        doc.registerFont('Amiri', FONT_REGULAR);
        doc.registerFont('Amiri-Bold', FONT_BOLD);
      }

      const barcodeBuffer = await generateBarcodePng(data.indexNumber);

      let qrBuffer: Buffer | null = null;
      try {
        const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
          width: 200,
          margin: 0,
          color: { dark: GREEN_DARK, light: '#FFFFFF' },
        });
        qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      } catch {}

      drawFrontPage(doc, data, hasAmiri, barcodeBuffer, qrBuffer);
      doc.addPage({ size: [W, H], margin: 0 });
      drawBackPage(doc, data, hasAmiri, barcodeBuffer, qrBuffer);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function generateBulkStudentExamCards(studentList: StudentCardData[]): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [W, H],
        margin: 0,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const hasAmiri = fs.existsSync(FONT_BOLD) && fs.existsSync(FONT_REGULAR);
      if (hasAmiri) {
        doc.registerFont('Amiri', FONT_REGULAR);
        doc.registerFont('Amiri-Bold', FONT_BOLD);
      }

      for (let i = 0; i < studentList.length; i++) {
        const data = studentList[i];

        if (i > 0) {
          doc.addPage({ size: [W, H], margin: 0 });
        }

        const barcodeBuffer = await generateBarcodePng(data.indexNumber);

        let qrBuffer: Buffer | null = null;
        try {
          const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
            width: 200,
            margin: 0,
            color: { dark: GREEN_DARK, light: '#FFFFFF' },
          });
          qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
        } catch {}

        drawFrontPage(doc, data, hasAmiri, barcodeBuffer, qrBuffer);
        doc.addPage({ size: [W, H], margin: 0 });
        drawBackPage(doc, data, hasAmiri, barcodeBuffer, qrBuffer);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
