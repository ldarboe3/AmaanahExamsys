import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { shapeArabicText } from './arabicTextHelper';

const FONT_REGULAR = path.resolve(process.cwd(), 'fonts', 'Amiri-Regular.ttf');
const FONT_BOLD = path.resolve(process.cwd(), 'fonts', 'Amiri-Bold.ttf');

const CARD_WIDTH = 243;
const CARD_HEIGHT = 153;
const SCALE = 2.5;
const W = CARD_WIDTH * SCALE;
const H = CARD_HEIGHT * SCALE;
const MARGIN = 15 * SCALE;

const TEAL = '#0D9488';
const DARK_TEAL = '#0F766E';
const LIGHT_BG = '#F0FDFA';
const WHITE = '#FFFFFF';
const DARK = '#1E293B';
const GRAY = '#64748B';

interface StaffCardData {
  staffIdNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  fullNameArabic?: string | null;
  role: string;
  regionName?: string | null;
  clusterName?: string | null;
  photoUrl?: string | null;
  confirmationCode?: string | null;
  issueDate?: Date | string | null;
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

      doc.rect(0, 0, W, H).fill(WHITE);

      doc.rect(0, 0, W, 55 * SCALE).fill(TEAL);

      const logoPath = getLogoPath();
      const logoSize = 30 * SCALE;
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, MARGIN, 12 * SCALE, { width: logoSize, height: logoSize });
        } catch {}
      }

      const headerTextX = MARGIN + logoSize + 8 * SCALE;
      doc
        .font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
        .fontSize(11 * SCALE)
        .fillColor(WHITE)
        .text('AMAANAH', headerTextX, 15 * SCALE, { width: W - headerTextX - MARGIN });

      doc
        .font(hasAmiri ? 'Amiri' : 'Helvetica')
        .fontSize(5.5 * SCALE)
        .fillColor('#CCFBF1')
        .text('EXAMINATION MANAGEMENT SYSTEM', headerTextX, 30 * SCALE, { width: W - headerTextX - MARGIN });

      doc
        .font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
        .fontSize(6 * SCALE)
        .fillColor('#F0FDFA')
        .text('STAFF IDENTITY CARD', headerTextX, 40 * SCALE, { width: W - headerTextX - MARGIN });

      const bodyY = 60 * SCALE;
      const photoSize = 35 * SCALE;
      const photoX = MARGIN;
      const photoY = bodyY + 5 * SCALE;

      doc.rect(photoX, photoY, photoSize, photoSize).fill('#E2E8F0');

      if (data.photoUrl) {
        try {
          const photoPath = path.resolve(process.cwd(), data.photoUrl.replace(/^\//, ''));
          if (fs.existsSync(photoPath)) {
            doc.image(photoPath, photoX + 1, photoY + 1, {
              width: photoSize - 2,
              height: photoSize - 2,
              fit: [photoSize - 2, photoSize - 2],
              align: 'center',
              valign: 'center',
            });
          }
        } catch {}
      }

      doc.rect(photoX, photoY, photoSize, photoSize).lineWidth(1).stroke(TEAL);

      const infoX = photoX + photoSize + 10 * SCALE;
      let infoY = bodyY + 3 * SCALE;
      const infoWidth = W - infoX - MARGIN - 40 * SCALE;

      const fullName = [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ');

      doc
        .font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
        .fontSize(8 * SCALE)
        .fillColor(DARK)
        .text(fullName, infoX, infoY, { width: infoWidth });
      infoY += 12 * SCALE;

      if (data.fullNameArabic && hasAmiri) {
        const shaped = shapeArabicText(data.fullNameArabic);
        doc
          .font('Amiri')
          .fontSize(7 * SCALE)
          .fillColor(GRAY)
          .text(shaped, infoX, infoY, { width: infoWidth, align: 'left' });
        infoY += 10 * SCALE;
      }

      doc
        .font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
        .fontSize(6.5 * SCALE)
        .fillColor(TEAL)
        .text(roleLabels[data.role] || data.role, infoX, infoY, { width: infoWidth });
      infoY += 10 * SCALE;

      if (data.regionName) {
        doc
          .font(hasAmiri ? 'Amiri' : 'Helvetica')
          .fontSize(5.5 * SCALE)
          .fillColor(GRAY)
          .text(
            data.clusterName ? `${data.regionName} / ${data.clusterName}` : data.regionName,
            infoX, infoY, { width: infoWidth }
          );
        infoY += 8 * SCALE;
      }

      const qrSize = 35 * SCALE;
      const qrX = W - MARGIN - qrSize;
      const qrY = bodyY + 5 * SCALE;

      try {
        const qrDataUrl = await QRCode.toDataURL(data.verifyUrl, {
          width: qrSize,
          margin: 0,
          color: { dark: DARK_TEAL, light: '#FFFFFF' },
        });
        const qrBuffer = Buffer.from(qrDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
        doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      } catch {}

      const footerY = H - 30 * SCALE;

      doc.rect(0, footerY, W, 30 * SCALE).fill(LIGHT_BG);
      doc.moveTo(0, footerY).lineTo(W, footerY).lineWidth(0.5).stroke(TEAL);

      doc
        .font(hasAmiri ? 'Amiri-Bold' : 'Helvetica-Bold')
        .fontSize(7 * SCALE)
        .fillColor(TEAL)
        .text(`ID: ${data.staffIdNumber}`, MARGIN, footerY + 5 * SCALE, { width: W / 2 });

      if (data.confirmationCode) {
        doc
          .font(hasAmiri ? 'Amiri' : 'Helvetica')
          .fontSize(5 * SCALE)
          .fillColor(GRAY)
          .text(`Code: ${data.confirmationCode}`, MARGIN, footerY + 16 * SCALE, { width: W / 2 });
      }

      const issueDateStr = data.issueDate
        ? new Date(data.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      doc
        .font(hasAmiri ? 'Amiri' : 'Helvetica')
        .fontSize(5 * SCALE)
        .fillColor(GRAY)
        .text(`Issued: ${issueDateStr}`, W / 2, footerY + 5 * SCALE, {
          width: W / 2 - MARGIN,
          align: 'right',
        });

      doc
        .font(hasAmiri ? 'Amiri' : 'Helvetica')
        .fontSize(4.5 * SCALE)
        .fillColor(GRAY)
        .text('Scan QR to verify', W / 2, footerY + 16 * SCALE, {
          width: W / 2 - MARGIN,
          align: 'right',
        });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
