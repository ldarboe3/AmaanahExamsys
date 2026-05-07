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

const CONTACT_PHONE = '+220 368 1104';
const CONTACT_EMAIL = 'info@amaanah.gm';
const CONTACT_WEBSITE = 'www.amaanah.gm';

interface StaffCardData {
  staffIdNumber: string;
  employeeId?: string | null;
  confirmationCode?: string | null;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  fullNameArabic?: string | null;
  role: string;
  department?: string | null;
  regionName?: string | null;
  clusterName?: string | null;
  photoUrl?: string | null;
  photoBuffer?: Buffer | null;
  phone?: string | null;
  email?: string | null;
  issueDate?: Date | string | null;
  expiryDate?: string | null;
  verifyUrl: string;
}

const roleLabels: Record<string, string> = {
  hq_director: "HQ Director",
  hq_staff: "HQ Staff",
  regional_coordinator: "Regional Coordinator",
  regional_staff: "Regional Staff",
  cluster_officer: "Cluster Operations Officer",
  examiner: "Examiner",
};

function getLogoPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'attached_assets', 'WhatsApp_Image_2026-04-09_at_15.55.56_1775751669894.jpeg'),
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
  const barcodeOpts: any = {
    bcid: 'code128',
    text: text,
    scale: 4,
    height: opts?.height || 12,
    includetext: false,
    backgroundcolor: 'FFFFFF',
    barcolor: '000000',
  };
  if (opts?.width) {
    barcodeOpts.width = opts.width;
  }
  const png = await bwipjs.toBuffer(barcodeOpts);
  return png;
}

function buildBarcodePayload(data: StaffCardData): string {
  const eid = data.employeeId || data.staffIdNumber;
  if (data.confirmationCode) {
    return `${eid}:${data.confirmationCode}`;
  }
  return eid;
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
  const footerStart = h * 0.91;

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

function abbreviateDept(dept: string): string {
  return dept
    .replace(/\bQuality Assurance\b/gi, 'QA')
    .replace(/\bExaminations?\b/gi, 'Exams')
    .replace(/\bAdministration\b/gi, 'Admin')
    .replace(/\bManagement\b/gi, 'Mgmt')
    .replace(/\bInformation Technology\b/gi, 'IT')
    .replace(/\bHuman Resources\b/gi, 'HR')
    .replace(/\bFinance & Accounts\b/gi, 'Finance')
    .replace(/\bPlanning & Development\b/gi, 'Planning & Dev')
    .replace(/\s+/g, ' ')
    .trim();
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
  const photoSize = 62;
  const photoCenterX = W / 2;
  const photoCenterY = headerH + 6;

  doc.circle(photoCenterX, photoCenterY, photoSize / 2 + 3).fill(GREEN_MID);
  doc.circle(photoCenterX, photoCenterY, photoSize / 2 + 1).fill(WHITE);

  doc.save();
  doc.circle(photoCenterX, photoCenterY, photoSize / 2).clip();
  if (data.photoBuffer) {
    try {
      doc.image(data.photoBuffer, photoCenterX - photoSize / 2, photoCenterY - photoSize / 2, {
        width: photoSize,
        height: photoSize,
        fit: [photoSize, photoSize],
        align: 'center',
        valign: 'center',
      });
    } catch {
      doc.rect(photoCenterX - photoSize / 2, photoCenterY - photoSize / 2, photoSize, photoSize).fill('#E8E8E8');
    }
  } else {
    doc.rect(photoCenterX - photoSize / 2, photoCenterY - photoSize / 2, photoSize, photoSize).fill('#E8E8E8');
  }
  doc.restore();

  const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');
  const nameY = photoCenterY + photoSize / 2 + 8;

  doc.font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
    .fontSize(10)
    .fillColor(DARK)
    .text(fullName, 8, nameY, { width: W - 16, align: 'center' });

  const roleLabel = roleLabels[data.role] || data.role;
  doc.font(hasAmiri ? 'Amiri' : 'Helvetica')
    .fontSize(7.5)
    .fillColor(GREEN_DARK)
    .text(roleLabel, 8, nameY + 14, { width: W - 16, align: 'center' });

  let infoY = nameY + 30;
  const labelX = 12;
  const valueX = 50;
  const infoWidth = W - valueX - 8;
  const lineH = 13;

  const drawInfoLine = (label: string, value: string, noWrap = false) => {
    const opts: Record<string, any> = { width: infoWidth };
    if (noWrap) opts.lineBreak = false;

    const valueHeight = noWrap
      ? lineH
      : doc.font(hasAmiri ? 'Amiri' : 'Helvetica').fontSize(7).heightOfString(`:  ${value}`, { width: infoWidth });

    doc.font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
      .fontSize(7)
      .fillColor(DARK)
      .text(label, labelX, infoY, { width: 36, lineBreak: false });

    doc.font(hasAmiri ? 'Amiri' : 'Helvetica')
      .fontSize(7)
      .fillColor(DARK)
      .text(`:  ${value}`, valueX, infoY, opts);

    infoY += Math.max(lineH, valueHeight + 4);
  };

  drawInfoLine('EID', data.employeeId || data.staffIdNumber);
  if (data.department) {
    drawInfoLine('Dept', abbreviateDept(data.department), true);
  }
  drawInfoLine('Post', roleLabel);

  let workplace = 'Headquarters';
  const hqRoles = ['hq_director', 'hq_staff'];
  const regionalRoles = ['regional_coordinator', 'regional_staff'];
  if (hqRoles.includes(data.role)) {
    workplace = 'Headquarters';
  } else if (regionalRoles.includes(data.role)) {
    workplace = data.regionName ? `Regional Office — ${data.regionName}` : 'Regional Office';
  } else if (data.clusterName) {
    workplace = data.clusterName;
  } else if (data.regionName) {
    workplace = `Regional Office — ${data.regionName}`;
  }
  drawInfoLine('Base', workplace);

  drawGreenWaveFooter(doc, W, H);

  const barcodeW = 70;
  const barcodeH = 20;
  const barcodeX = (W - barcodeW) / 2;
  const barcodeY = H * 0.91 + 6;
  try {
    doc.image(barcodeBuffer, barcodeX, barcodeY, { width: barcodeW, height: barcodeH });
  } catch {}
}

function drawBackPage(doc: typeof PDFDocument.prototype, data: StaffCardData, hasAmiri: boolean, qrBuffer: Buffer | null) {
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

  contentY += 10;

  doc.moveTo(mx, contentY).lineTo(W - mx, contentY).lineWidth(0.3).stroke('#CCCCCC');
  contentY += 6;

  doc.font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
    .fontSize(5.5)
    .fillColor(GREEN_DARK)
    .text('Contact', mx, contentY, { width: contentW });

  contentY += 9;

  const contactLines = [
    CONTACT_PHONE,
    CONTACT_EMAIL,
    CONTACT_WEBSITE,
  ];

  contactLines.forEach(line => {
    doc.font(hasAmiri ? 'Amiri' : 'Helvetica')
      .fontSize(4.8)
      .fillColor(GRAY)
      .text(line, mx, contentY, { width: contentW });
    contentY += 7;
  });

  contentY += 4;

  const qrSize = 34;
  const qrX = (W - qrSize) / 2;
  const qrY = contentY;

  if (qrBuffer) {
    try {
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    } catch {}
  }

  drawGreenWaveFooter(doc, W, H);

  doc.font(hasAmiri ? 'Amiri' : 'Helvetica')
    .fontSize(4)
    .fillColor(WHITE)
    .text('Scan QR to verify', 8, H * 0.91 + 12, { width: W - 16, align: 'center', lineBreak: false });
}

async function loadPhotoBuffer(photoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!photoUrl) return null;
  try {
    const localPath = path.resolve(process.cwd(), photoUrl.replace(/^\//, ''));
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }
    const baseUrl = `http://localhost:${process.env.PORT || 5000}`;
    const response = await fetch(`${baseUrl}${photoUrl}`);
    if (response.ok) {
      const arrayBuf = await response.arrayBuffer();
      return Buffer.from(arrayBuf);
    }
  } catch {}
  return null;
}

export async function generateStaffIdCard(data: StaffCardData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      if (!data.photoBuffer && data.photoUrl) {
        data.photoBuffer = await loadPhotoBuffer(data.photoUrl);
      }

      const doc = new PDFDocument({
        size: [W, H],
        margin: 0,
        autoFirstPage: false,
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

      const barcodePayload = buildBarcodePayload(data);
      const barcodeBuffer = await generateBarcodePng(barcodePayload);

      let qrBuffer: Buffer | null = null;
      try {
        const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
          width: 150,
          margin: 0,
          color: { dark: GREEN_DARK, light: '#FFFFFF' },
        });
        qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
      } catch {}

      doc.addPage({ size: [W, H], margin: 0 });
      drawFrontPage(doc, data, hasAmiri, barcodeBuffer);

      doc.addPage({ size: [W, H], margin: 0 });
      drawBackPage(doc, data, hasAmiri, qrBuffer);

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
        autoFirstPage: false,
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

        if (!data.photoBuffer && data.photoUrl) {
          data.photoBuffer = await loadPhotoBuffer(data.photoUrl);
        }

        const barcodePayload = buildBarcodePayload(data);
        const barcodeBuffer = await generateBarcodePng(barcodePayload);

        let qrBuffer: Buffer | null = null;
        try {
          const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
            width: 150,
            margin: 0,
            color: { dark: GREEN_DARK, light: '#FFFFFF' },
          });
          qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
        } catch {}

        doc.addPage({ size: [W, H], margin: 0 });
        drawFrontPage(doc, data, hasAmiri, barcodeBuffer);

        doc.addPage({ size: [W, H], margin: 0 });
        drawBackPage(doc, data, hasAmiri, qrBuffer);
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
