import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { shapeArabicText } from './arabicTextHelper';
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
const GREEN_ACCENT = '#3EC97F';
const WHITE = '#FFFFFF';
const DARK = '#1A1A1A';
const GRAY = '#555555';
const LIGHT_GRAY = '#888888';
const CREAM = '#F5F5F0';

interface StaffCardData {
  staffIdNumber: string;
  employeeId?: string | null;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  fullNameArabic?: string | null;
  role: string;
  department?: string | null;
  regionName?: string | null;
  clusterName?: string | null;
  photoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  confirmationCode?: string | null;
  issueDate?: Date | string | null;
  expiryDate?: string | null;
  verifyUrl: string;
}

const roleLabels: Record<string, string> = {
  hq_director: "HQ Director",
  hq_staff: "HQ Staff",
  regional_coordinator: "Regional Coordinator",
  regional_staff: "Regional Staff",
  cluster_officer: "Cluster Officer",
  examiner: "Examiner",
  invigilator: "Invigilator",
  supervisor: "Supervisor",
  monitor: "Monitor",
  temporary_staff: "Temporary Staff",
};

function getLogoPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'attached_assets', 'Amana_Logo_1765129635267.png'),
    path.resolve(process.cwd(), 'attached_assets', 'Amana_Logo_1765049398386.png'),
    path.resolve(process.cwd(), 'attached_assets', 'Amana_Logo_1764991014851.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

async function generateBarcodePng(text: string, opts?: { width?: number; height?: number }): Promise<Buffer> {
  const png = await bwipjs.toBuffer({
    bcid: 'code128',
    text: text,
    scale: 3,
    height: opts?.height || 8,
    width: opts?.width || undefined,
    includetext: false,
    backgroundcolor: 'FFFFFF',
    barcolor: '000000',
  });
  return png;
}

function drawGreenWaveHeader(doc: typeof PDFDocument.prototype, w: number, h: number) {
  const headerH = h * 0.30;

  const grad = doc.linearGradient(0, 0, w, headerH);
  grad.stop(0, GREEN_DARK);
  grad.stop(0.5, GREEN_MID);
  grad.stop(1, GREEN_LIGHT);
  doc.rect(0, 0, w, headerH).fill(grad);

  doc.save();
  doc.moveTo(0, headerH - 15)
    .bezierCurveTo(w * 0.25, headerH + 8, w * 0.6, headerH - 25, w, headerH - 5)
    .lineTo(w, headerH + 10)
    .bezierCurveTo(w * 0.65, headerH - 5, w * 0.3, headerH + 15, 0, headerH + 2)
    .closePath()
    .fill(GREEN_ACCENT);
  doc.restore();

  doc.save();
  doc.moveTo(0, headerH)
    .bezierCurveTo(w * 0.3, headerH + 12, w * 0.7, headerH - 8, w, headerH + 5)
    .lineTo(w, headerH + 15)
    .bezierCurveTo(w * 0.65, headerH + 2, w * 0.35, headerH + 18, 0, headerH + 8)
    .closePath()
    .fill(GREEN_LIGHT);
  doc.restore();
}

function drawGreenWaveFooter(doc: typeof PDFDocument.prototype, w: number, h: number) {
  const footerStart = h * 0.88;

  doc.save();
  doc.moveTo(0, footerStart + 5)
    .bezierCurveTo(w * 0.3, footerStart - 10, w * 0.7, footerStart + 15, w, footerStart)
    .lineTo(w, h)
    .lineTo(0, h)
    .closePath();
  const grad = doc.linearGradient(0, footerStart, w, h);
  grad.stop(0, GREEN_LIGHT);
  grad.stop(0.5, GREEN_MID);
  grad.stop(1, GREEN_DARK);
  doc.fill(grad);
  doc.restore();
}

function drawFrontPage(doc: typeof PDFDocument.prototype, data: StaffCardData, hasAmiri: boolean, barcodeBuffer: Buffer) {
  doc.rect(0, 0, W, H).fill(WHITE);

  drawGreenWaveHeader(doc, W, H);

  const logoPath = getLogoPath();
  const logoSize = 28;
  const logoX = 10;
  const logoY = 10;
  if (fs.existsSync(logoPath)) {
    try {
      doc.save();
      const cx = logoX + logoSize / 2;
      const cy = logoY + logoSize / 2;
      const r = logoSize / 2;
      doc.circle(cx, cy, r + 2).fill(WHITE);
      doc.circle(cx, cy, r).clip();
      doc.image(logoPath, logoX, logoY, { width: logoSize, height: logoSize });
      doc.restore();
    } catch {}
  }

  const textX = logoX + logoSize + 6;
  doc.font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
    .fontSize(9)
    .fillColor(WHITE)
    .text('AMAANAH', textX, 14, { width: W - textX - 10 });

  doc.font(hasAmiri ? 'Amiri' : 'Helvetica')
    .fontSize(5)
    .fillColor('#D1FAE5')
    .text('EXAMINATION MANAGEMENT', textX, 25, { width: W - textX - 10 });

  doc.font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
    .fontSize(6)
    .fillColor(WHITE)
    .text('STAFF IDENTITY CARD', textX, 32, { width: W - textX - 10 });

  const headerH = H * 0.30;
  const photoSize = 48;
  const photoCenterX = W / 2;
  const photoCenterY = headerH + 2;

  doc.circle(photoCenterX, photoCenterY, photoSize / 2 + 3).fill(GREEN_MID);
  doc.circle(photoCenterX, photoCenterY, photoSize / 2 + 1).fill(WHITE);

  doc.save();
  doc.circle(photoCenterX, photoCenterY, photoSize / 2).clip();
  if (data.photoUrl) {
    try {
      const photoPath = path.resolve(process.cwd(), data.photoUrl.replace(/^\//, ''));
      if (fs.existsSync(photoPath)) {
        doc.image(photoPath, photoCenterX - photoSize / 2, photoCenterY - photoSize / 2, {
          width: photoSize,
          height: photoSize,
          fit: [photoSize, photoSize],
          align: 'center',
          valign: 'center',
        });
      } else {
        doc.rect(photoCenterX - photoSize / 2, photoCenterY - photoSize / 2, photoSize, photoSize).fill('#E8E8E8');
      }
    } catch {
      doc.rect(photoCenterX - photoSize / 2, photoCenterY - photoSize / 2, photoSize, photoSize).fill('#E8E8E8');
    }
  } else {
    doc.rect(photoCenterX - photoSize / 2, photoCenterY - photoSize / 2, photoSize, photoSize).fill('#E8E8E8');
  }
  doc.restore();

  const fullName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ');
  const nameY = photoCenterY + photoSize / 2 + 8;

  doc.font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
    .fontSize(9)
    .fillColor(DARK)
    .text(fullName, 8, nameY, { width: W - 16, align: 'center' });

  const roleLabel = roleLabels[data.role] || data.role;
  doc.font(hasAmiri ? 'Amiri' : 'Helvetica')
    .fontSize(6.5)
    .fillColor(GREEN_DARK)
    .text(roleLabel, 8, nameY + 13, { width: W - 16, align: 'center' });

  let infoY = nameY + 28;
  const labelX = 12;
  const valueX = 52;
  const infoWidth = W - valueX - 10;
  const lineH = 11;

  const drawInfoLine = (label: string, value: string) => {
    doc.font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
      .fontSize(5.5)
      .fillColor(DARK)
      .text(label, labelX, infoY, { width: 38 });

    doc.font(hasAmiri ? 'Amiri' : 'Helvetica')
      .fontSize(5.5)
      .fillColor(DARK)
      .text(`:  ${value}`, valueX, infoY, { width: infoWidth });

    infoY += lineH;
  };

  drawInfoLine('ID', data.employeeId || data.staffIdNumber);
  if (data.department) {
    drawInfoLine('Dept', data.department);
  }
  if (data.phone) {
    drawInfoLine('Phone', data.phone);
  }
  if (data.email) {
    drawInfoLine('Email', data.email);
  }

  drawGreenWaveFooter(doc, W, H);

  const barcodeW = 70;
  const barcodeH = 18;
  const barcodeX = (W - barcodeW) / 2;
  const barcodeY = H * 0.88 + 8;
  try {
    doc.image(barcodeBuffer, barcodeX, barcodeY, { width: barcodeW, height: barcodeH });
    doc.font('Helvetica')
      .fontSize(4)
      .fillColor(WHITE)
      .text(data.employeeId || data.staffIdNumber, barcodeX, barcodeY + barcodeH + 1, { width: barcodeW, align: 'center' });
  } catch {}
}

function drawBackPage(doc: typeof PDFDocument.prototype, data: StaffCardData, hasAmiri: boolean, barcodeBuffer: Buffer, qrBuffer: Buffer | null) {
  doc.rect(0, 0, W, H).fill(WHITE);

  drawGreenWaveHeader(doc, W, H);

  const logoPath = getLogoPath();
  const logoSize = 32;
  const logoCenterX = W / 2;
  const logoY = 12;
  if (fs.existsSync(logoPath)) {
    try {
      doc.save();
      const cx = logoCenterX;
      const cy = logoY + logoSize / 2;
      const r = logoSize / 2;
      doc.circle(cx, cy, r + 2).fill(WHITE);
      doc.circle(cx, cy, r).clip();
      doc.image(logoPath, logoCenterX - logoSize / 2, logoY, { width: logoSize, height: logoSize });
      doc.restore();
    } catch {}
  }

  doc.font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
    .fontSize(9)
    .fillColor(WHITE)
    .text('AMAANAH', 8, logoY + logoSize + 6, { width: W - 16, align: 'center' });

  doc.font(hasAmiri ? 'Amiri' : 'Helvetica')
    .fontSize(5)
    .fillColor('#D1FAE5')
    .text('Examination Management System', 8, logoY + logoSize + 18, { width: W - 16, align: 'center' });

  const headerH = H * 0.30;
  let contentY = headerH + 18;
  const mx = 12;
  const contentW = W - mx * 2;

  doc.font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
    .fontSize(6.5)
    .fillColor(GREEN_DARK)
    .text('Terms and Conditions', mx, contentY, { width: contentW });

  contentY += 12;

  const terms = [
    'Staff are required to carry this card while on duty.',
    'If lost or damaged, report immediately to HQ administration.',
    'This card remains property of Amaanah and must be returned upon request.',
  ];

  terms.forEach(term => {
    doc.circle(mx + 3, contentY + 3, 2).fill(GREEN_MID);

    doc.font(hasAmiri ? 'Amiri' : 'Helvetica')
      .fontSize(5)
      .fillColor(GRAY)
      .text(term, mx + 9, contentY, { width: contentW - 12 });

    contentY += 14;
  });

  contentY += 4;
  doc.moveTo(mx, contentY).lineTo(W - mx, contentY).lineWidth(0.3).stroke('#CCCCCC');
  contentY += 6;

  doc.font(hasAmiri ? 'Amiri' : 'Helvetica')
    .fontSize(5)
    .fillColor(LIGHT_GRAY)
    .text('Authorized Signature', mx, contentY, { width: contentW });

  contentY += 10;
  doc.moveTo(mx + 5, contentY).lineTo(mx + 60, contentY).lineWidth(0.5).stroke(GRAY);

  contentY += 8;

  const issueDateStr = data.issueDate
    ? new Date(data.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const expiryStr = data.expiryDate || (() => {
    const d = data.issueDate ? new Date(data.issueDate) : new Date();
    d.setFullYear(d.getFullYear() + 2);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  })();

  doc.font(hasAmiri ? 'Amiri' : 'Helvetica')
    .fontSize(5)
    .fillColor(DARK)
    .text(`Issue Date   :  ${issueDateStr}`, mx, contentY, { width: contentW });

  contentY += 9;

  doc.font(hasAmiri ? 'Amiri' : 'Helvetica')
    .fontSize(5)
    .fillColor(DARK)
    .text(`Expire Date  :  ${expiryStr}`, mx, contentY, { width: contentW });

  contentY += 12;

  const qrSize = 32;
  const qrX = mx;
  const qrY = contentY;

  if (qrBuffer) {
    try {
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    } catch {}
  }

  const backBarcodeW = 55;
  const backBarcodeH = 16;
  const backBarcodeX = W - mx - backBarcodeW;
  const backBarcodeY = qrY + 4;
  try {
    doc.image(barcodeBuffer, backBarcodeX, backBarcodeY, { width: backBarcodeW, height: backBarcodeH });
    doc.font('Helvetica')
      .fontSize(3.5)
      .fillColor(GRAY)
      .text(data.employeeId || data.staffIdNumber, backBarcodeX, backBarcodeY + backBarcodeH + 1, { width: backBarcodeW, align: 'center' });
  } catch {}

  drawGreenWaveFooter(doc, W, H);

  doc.font(hasAmiri ? 'Amiri' : 'Helvetica')
    .fontSize(4)
    .fillColor(WHITE)
    .text('Scan QR or barcode to verify', 8, H * 0.88 + 12, { width: W - 16, align: 'center' });
}

export async function generateStaffIdCard(data: StaffCardData): Promise<Buffer> {
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

      const barcodeText = data.employeeId || data.staffIdNumber;
      const barcodeBuffer = await generateBarcodePng(barcodeText);

      let qrBuffer: Buffer | null = null;
      try {
        const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
          width: 150,
          margin: 0,
          color: { dark: GREEN_DARK, light: '#FFFFFF' },
        });
        qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      } catch {}

      drawFrontPage(doc, data, hasAmiri, barcodeBuffer);

      doc.addPage({ size: [W, H], margin: 0 });

      drawBackPage(doc, data, hasAmiri, barcodeBuffer, qrBuffer);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function generateBulkStaffIdCards(staffList: StaffCardData[]): Promise<Buffer> {
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

      for (let i = 0; i < staffList.length; i++) {
        const data = staffList[i];

        if (i > 0) {
          doc.addPage({ size: [W, H], margin: 0 });
        }

        const barcodeText = data.employeeId || data.staffIdNumber;
        const barcodeBuffer = await generateBarcodePng(barcodeText);

        let qrBuffer: Buffer | null = null;
        try {
          const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
            width: 150,
            margin: 0,
            color: { dark: GREEN_DARK, light: '#FFFFFF' },
          });
          qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
        } catch {}

        drawFrontPage(doc, data, hasAmiri, barcodeBuffer);

        doc.addPage({ size: [W, H], margin: 0 });

        drawBackPage(doc, data, hasAmiri, barcodeBuffer, qrBuffer);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
