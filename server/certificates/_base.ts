/**
 * Shared certificate types and the generic PDFKit certificate generator.
 *
 * Grades 3, 9, and 12 use this generic template until a grade-specific
 * template is built. Grade 6 has its own dedicated file (grade6.ts).
 *
 * To create a specialized template for any grade:
 *   1. Open that grade's file (e.g. grade9.ts)
 *   2. Replace the call to `generateGenericCertificatePDF` with your own
 *      PDFDocument logic — use grade6CertificateService.ts as a reference.
 */
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { shapeArabicText } from '../arabicTextHelper';
import {
  getCertificateTemplate,
  getGradeLevelNameArabic,
  getGradeLevelNameEnglish,
  formatArabicDate,
  formatHijriDate,
  getGradeWord,
  arabicMonths,
} from '../certificateTemplates';

const FONT_REGULAR = path.resolve(process.cwd(), 'fonts', 'Amiri-Regular.ttf');
const FONT_BOLD    = path.resolve(process.cwd(), 'fonts', 'Amiri-Bold.ttf');

export const CERT_OUTPUT_DIR = path.join(process.cwd(), 'generated_certificates');
if (!fs.existsSync(CERT_OUTPUT_DIR)) fs.mkdirSync(CERT_OUTPUT_DIR, { recursive: true });

// ── Shared data types ─────────────────────────────────────────────────────────

export interface StudentData {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  gender: 'male' | 'female';
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  grade: number;
  indexNumber: string | null;
}

export interface SchoolData {
  id: number;
  name: string;
}

export interface ExamYearData {
  id: number;
  year: number;
  examStartDate: Date | null;
  examEndDate: Date | null;
}

export interface CertificateData {
  student: StudentData;
  school: SchoolData;
  examYear: ExamYearData;
  finalGrade: string;
  totalScore?: number;
  qrToken: string;
  certificateNumber: string;
  verifyUrl: string;
  isReprint?: boolean;
}

// ── Generic PDFKit certificate (used by Grade 3, 9, 12) ──────────────────────

export async function generateGenericCertificatePDF(data: CertificateData): Promise<string> {
  const { student, school, examYear, finalGrade, qrToken, certificateNumber, verifyUrl, isReprint } = data;

  const template   = getCertificateTemplate(student.grade, student.gender);
  const gradeLevelAr = getGradeLevelNameArabic(student.grade);
  const gradeLevelEn = getGradeLevelNameEnglish(student.grade);

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: template.qr.width * 2,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean).join(' ');

  const dobFormatted = student.dateOfBirth
    ? formatArabicDate(new Date(student.dateOfBirth))
    : '';

  const issueDate      = new Date();
  const issueDateGreg  = formatArabicDate(issueDate);
  const issueDateHijri = formatHijriDate(issueDate);

  let examWindowText = '';
  if (examYear.examStartDate && examYear.examEndDate) {
    const s = new Date(examYear.examStartDate);
    const e = new Date(examYear.examEndDate);
    const sm = arabicMonths[s.getMonth() + 1];
    const em = arabicMonths[e.getMonth() + 1];
    examWindowText = `الفترة: ${s.getDate()} ${sm} – ${e.getDate()} ${em}, ${examYear.year}`;
  }

  const gradeWordAr   = `(${getGradeWord(finalGrade)})`;
  const genderPrefix  = student.gender === 'male' ? 'طالب' : 'طالبة';
  const birthVerb     = student.gender === 'male' ? 'المولود' : 'المولودة';
  const completeVerb  = student.gender === 'male' ? 'أتم' : 'أتمت';
  const passedVerb    = student.gender === 'male' ? 'نجح' : 'نجحت';
  const gradeResult   = student.gender === 'male' ? 'تقديره' : 'تقديرها';

  return new Promise((resolve, reject) => {
    try {
      const fileName = `cert_${student.indexNumber || student.id}_${Date.now()}.pdf`;
      const filePath = path.join(CERT_OUTPUT_DIR, fileName);

      const doc    = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const hasFont = fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD);
      if (hasFont) {
        doc.registerFont('Arabic', FONT_REGULAR);
        doc.registerFont('ArabicBold', FONT_BOLD);
      }

      const pageWidth   = doc.page.width;
      const pageHeight  = doc.page.height;
      const margin      = 30;
      const contentWidth = pageWidth - margin * 2;
      const rightEdge   = pageWidth - margin;

      doc.rect(margin, margin, contentWidth, pageHeight - margin * 2)
        .lineWidth(3).stroke('#8B4513');
      doc.rect(margin + 8, margin + 8, contentWidth - 16, pageHeight - margin * 2 - 16)
        .lineWidth(1).stroke('#8B4513');

      let yPos = margin + 25;

      if (hasFont) {
        doc.font('ArabicBold').fontSize(16).fillColor('#1a5276');
        doc.text(shapeArabicText('بسم الله الرحمن الرحيم'), margin, yPos, { width: contentWidth, align: 'center' });
      }
      yPos += 30;

      doc.font('Helvetica').fontSize(9).fillColor('#333333');
      doc.text('THE REPUBLIC OF THE GAMBIA',            margin + 20, yPos);
      doc.text('DEPARTMENT OF STATE FOR',               margin + 20, yPos + 12);
      doc.text('BASIC AND SECONDARY EDUCATION',         margin + 20, yPos + 24);
      doc.text('The General Secretariat for Islamic/',  margin + 20, yPos + 36);
      doc.text('Arabic Education In The Gambia',        margin + 20, yPos + 48);

      if (hasFont) {
        doc.font('Arabic').fontSize(10);
        doc.text(shapeArabicText('جمهورية غامبيا'),                              rightEdge - 20, yPos,      { width: 180, align: 'right' });
        doc.text(shapeArabicText('وزارة التربية والتعليم الأساسي'),              rightEdge - 20, yPos + 14, { width: 180, align: 'right' });
        doc.text(shapeArabicText('الأمانة العامة للتعليم الإسلامي العربي'),      rightEdge - 20, yPos + 28, { width: 180, align: 'right' });
        doc.text(shapeArabicText('في غامبيا'),                                   rightEdge - 20, yPos + 42, { width: 180, align: 'right' });
      }

      yPos += 70;
      doc.moveTo(margin + 20, yPos).lineTo(rightEdge - 20, yPos).stroke('#dddddd');
      yPos += 15;

      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1a5276');
      doc.text(`GAMBIA MADRASSAH ${gradeLevelEn.toUpperCase()} CERTIFICATE`, margin, yPos, { width: contentWidth, align: 'center' });
      yPos += 22;

      if (hasFont) {
        doc.font('ArabicBold').fontSize(18).fillColor('#1a5276');
        doc.text(shapeArabicText(`شهادة إتمام دراسة ${gradeLevelAr}`), margin, yPos, { width: contentWidth, align: 'center' });
      }
      yPos += 35;

      if (hasFont) {
        doc.font('Arabic').fontSize(12).fillColor('#333333');

        doc.text(shapeArabicText(`تشهد الأمانة العامة بأن ال${genderPrefix}`), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        doc.font('ArabicBold').fillColor('#c0392b');
        doc.text(shapeArabicText(fullName), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        doc.font('Arabic').fillColor('#333333');
        doc.text(shapeArabicText(`${birthVerb} في ${student.placeOfBirth || '______'} بتاريخ: ${dobFormatted}`), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        doc.text(shapeArabicText(`قد ${completeVerb} دراسة ${gradeLevelAr} في مدرسة`), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        doc.font('ArabicBold').fillColor('#c0392b');
        doc.text(shapeArabicText(school.name), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        doc.font('Arabic').fillColor('#333333');
        doc.text(shapeArabicText(`بعد أن ${passedVerb} في الامتحان النهائي الذي أشرفت عليه الأمانة العامة`), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        doc.text(shapeArabicText('بالتنسيق مع وزارة التربية والتعليم في غامبيا.'), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 25;

        if (examWindowText) {
          doc.text(shapeArabicText(`${examWindowText}، وكان ${gradeResult} فيه`), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
          yPos += 18;
          doc.font('ArabicBold').fillColor('#c0392b').fontSize(14);
          doc.text(shapeArabicText(gradeWordAr), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
          yPos += 25;
        }

        doc.font('Arabic').fontSize(11).fillColor('#333333');
        doc.text(shapeArabicText(`سُجلت هذه الشهادة تحت رقم ( ${certificateNumber} )`), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 16;
        doc.text(shapeArabicText(`بتاريخ: ${issueDateHijri} الموافق ${issueDateGreg}`), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
      } else {
        doc.font('Helvetica').fontSize(11).fillColor('#333333');
        doc.text(`The General Secretariat certifies that the student ${fullName}`, margin + 30, yPos, { width: contentWidth - 60 });
        yPos += 15;
        doc.text(`born in ${student.placeOfBirth || '______'} on ${dobFormatted}`, margin + 30, yPos, { width: contentWidth - 60 });
        yPos += 15;
        doc.text(`has completed ${gradeLevelEn} at ${school.name}`, margin + 30, yPos, { width: contentWidth - 60 });
        yPos += 15;
        doc.text(`and passed the final examination with grade: ${finalGrade}`, margin + 30, yPos, { width: contentWidth - 60 });
        yPos += 25;
        doc.text(`Certificate Number: ${certificateNumber}`, margin + 30, yPos, { width: contentWidth - 60 });
        yPos += 15;
        doc.text(`Date: ${issueDateGreg}`, margin + 30, yPos, { width: contentWidth - 60 });
      }

      yPos = pageHeight - margin - 120;
      const sigBlockWidth = (contentWidth - 80) / 3;
      const sig1X = margin + 30;
      const sig2X = margin + 30 + sigBlockWidth + 20;
      const sig3X = margin + 30 + (sigBlockWidth + 20) * 2;

      doc.font(hasFont ? 'Arabic' : 'Helvetica').fontSize(9).fillColor('#333333');
      if (hasFont) {
        doc.text(shapeArabicText('توقيع رئيس الأمانة'),   sig1X, yPos, { width: sigBlockWidth, align: 'center' });
        doc.text(shapeArabicText('الختم الرسمي'),           sig2X, yPos, { width: sigBlockWidth, align: 'center' });
        doc.text(shapeArabicText('توقيع مدير المدرسة'),     sig3X, yPos, { width: sigBlockWidth, align: 'center' });
      } else {
        doc.text('Secretariat Chairman', sig1X, yPos, { width: sigBlockWidth, align: 'center' });
        doc.text('Official Stamp',       sig2X, yPos, { width: sigBlockWidth, align: 'center' });
        doc.text('School Director',      sig3X, yPos, { width: sigBlockWidth, align: 'center' });
      }

      yPos += 20;
      doc.moveTo(sig1X, yPos).lineTo(sig1X + sigBlockWidth - 20, yPos).stroke('#666666');
      doc.moveTo(sig3X, yPos).lineTo(sig3X + sigBlockWidth - 20, yPos).stroke('#666666');

      if (qrDataUrl) {
        const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        doc.image(qrBuffer, margin + 30, pageHeight - margin - 100, { width: 70 });
      }

      if (hasFont) {
        doc.font('Arabic').fontSize(9).fillColor('#666666');
        doc.text(shapeArabicText('أي كشط أو تغيير في هذه الشهادة يلغيها'), margin, pageHeight - margin - 15, { width: contentWidth, align: 'center' });
      }

      if (isReprint && hasFont) {
        doc.save();
        doc.translate(pageWidth / 2, pageHeight / 2).rotate(-45);
        doc.font('ArabicBold').fontSize(50).fillColor('rgba(192, 57, 43, 0.1)');
        doc.text(shapeArabicText('إعادة طباعة'), -120, -25);
        doc.restore();
      }

      doc.end();
      stream.on('finish', () => resolve(filePath));
      stream.on('error', (err) => reject(new Error(`Certificate PDF stream error: ${err.message}`)));
    } catch (error: any) {
      reject(new Error(`Certificate PDF generation error: ${error.message}`));
    }
  });
}
