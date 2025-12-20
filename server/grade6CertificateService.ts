import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { shapeArabicText } from './arabicTextHelper';
import {
  formatArabicDate,
  formatHijriDate,
  getGradeWord,
  generateCertificateNumber,
  arabicMonths,
} from './certificateTemplates';

// Font paths for pdfkit
const FONT_REGULAR = path.join(process.cwd(), 'fonts', 'Amiri-Regular.ttf');
const FONT_BOLD = path.join(process.cwd(), 'fonts', 'Amiri-Bold.ttf');


interface StudentData {
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

interface SchoolData {
  id: number;
  name: string;
}

interface ExamYearData {
  id: number;
  year: number;
  examStartDate: Date | null;
  examEndDate: Date | null;
}

interface Grade6CertificateData {
  student: StudentData;
  school: SchoolData;
  examYear: ExamYearData;
  finalGrade: string;
  qrToken: string;
  certificateNumber: string;
  verifyUrl: string;
  isReprint?: boolean;
}

const outputDir = path.join(process.cwd(), 'generated_certificates');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

export async function generateGrade6CertificatePDF(data: Grade6CertificateData): Promise<string> {
  const { student, school, examYear, finalGrade, qrToken, certificateNumber, verifyUrl, isReprint } = data;

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 140,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  });

  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');

  const dobFormatted = student.dateOfBirth 
    ? formatArabicDate(new Date(student.dateOfBirth))
    : '';
  
  const issueDate = new Date();
  const issueDateGreg = formatArabicDate(issueDate);
  const issueDateHijri = formatHijriDate(issueDate);

  let examWindowText = '';
  if (examYear.examStartDate && examYear.examEndDate) {
    const startDate = new Date(examYear.examStartDate);
    const endDate = new Date(examYear.examEndDate);
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const startMonth = arabicMonths[startDate.getMonth() + 1];
    const endMonth = arabicMonths[endDate.getMonth() + 1];
    examWindowText = `${startDay} ${startMonth} - ${endDay} ${endMonth}, ${examYear.year}`;
  }

  const gradeWordAr = getGradeWord(finalGrade);
  
  const isMale = student.gender === 'male';
  const studentLabel = isMale ? 'طالب' : 'طالبة';
  const birthLabel = isMale ? 'المولود' : 'المولودة';
  const completedVerb = isMale ? 'قد أتم' : 'قد أتمت';
  const successVerb = isMale ? 'نجح' : 'نجحت';
  const gradePronoun = isMale ? 'تقديره' : 'تقديرها';

  return new Promise((resolve, reject) => {
    try {
      const fileName = `grade6_cert_${student.indexNumber || student.id}_${Date.now()}.pdf`;
      const filePath = path.join(outputDir, fileName);
      
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);
      
      const hasArabicFont = fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD);
      if (hasArabicFont) {
        doc.registerFont('Arabic', FONT_REGULAR);
        doc.registerFont('ArabicBold', FONT_BOLD);
      }
      
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 30;
      const contentWidth = pageWidth - (margin * 2);
      const rightEdge = pageWidth - margin;
      
      doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2))
        .lineWidth(3).stroke('#8B6914');
      doc.rect(margin + 8, margin + 8, contentWidth - 16, pageHeight - (margin * 2) - 16)
        .lineWidth(1).stroke('#8B6914');
      
      let yPos = margin + 25;
      
      if (hasArabicFont) {
        doc.font('ArabicBold').fontSize(16).fillColor('#1a3a52');
        doc.text(shapeArabicText('بسم الله الرحمن الرحيم'), margin, yPos, { width: contentWidth, align: 'center' });
      }
      yPos += 30;
      
      doc.font('Helvetica').fontSize(9).fillColor('#333333');
      doc.text('THE REPUBLIC OF THE GAMBIA', margin + 20, yPos);
      doc.text('DEPARTMENT OF STATE FOR', margin + 20, yPos + 12);
      doc.text('BASIC AND SECONDARY EDUCATION', margin + 20, yPos + 24);
      doc.text('The General Secretariat for Islamic/', margin + 20, yPos + 36);
      doc.text('Arabic Education In The Gambia', margin + 20, yPos + 48);
      
      if (hasArabicFont) {
        doc.font('Arabic').fontSize(10);
        doc.text(shapeArabicText('جمهورية غامبيا'), rightEdge - 20, yPos, { width: 180, align: 'right' });
        doc.text(shapeArabicText('وزارة التربية والتعليم الأساسي'), rightEdge - 20, yPos + 14, { width: 180, align: 'right' });
        doc.text(shapeArabicText('الأمانة العامة للتعليم الإسلامي العربي'), rightEdge - 20, yPos + 28, { width: 180, align: 'right' });
        doc.text(shapeArabicText('في غامبيا'), rightEdge - 20, yPos + 42, { width: 180, align: 'right' });
      }
      
      yPos += 70;
      doc.moveTo(margin + 20, yPos).lineTo(rightEdge - 20, yPos).stroke('#dddddd');
      yPos += 15;
      
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1a3a52');
      doc.text('GAMBIA MADRASSAH PRIMARY CERTIFICATE', margin, yPos, { width: contentWidth, align: 'center' });
      yPos += 22;
      
      if (hasArabicFont) {
        doc.font('ArabicBold').fontSize(18).fillColor('#1a3a52');
        doc.text(shapeArabicText('شهادة إتمام دراسة المرحلة الابتدائية العليا'), margin, yPos, { width: contentWidth, align: 'center' });
      }
      yPos += 35;
      
      if (hasArabicFont) {
        doc.font('Arabic').fontSize(12).fillColor('#333333');
        
        const line1 = `تشهد الأمانة العامة بأن ال${studentLabel}`;
        doc.text(shapeArabicText(line1), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        
        doc.font('ArabicBold').fillColor('#c0392b');
        doc.text(shapeArabicText(fullName), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        
        doc.font('Arabic').fillColor('#333333');
        const line2 = `${birthLabel} في ${student.placeOfBirth || '______'} بتاريخ: ${dobFormatted}`;
        doc.text(shapeArabicText(line2), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        
        const line3 = `${completedVerb} دراسة المرحلة الابتدائية العليا في مدرسة`;
        doc.text(shapeArabicText(line3), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        
        doc.font('ArabicBold').fillColor('#c0392b');
        doc.text(shapeArabicText(school.name), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        
        doc.font('Arabic').fillColor('#333333');
        const line4 = `بعد أن ${successVerb} في الامتحان النهائي الذي أشرفت عليه الأمانة العامة`;
        doc.text(shapeArabicText(line4), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        
        doc.text(shapeArabicText('بالتنسيق مع وزارة التربية والتعليم في غامبيا.'), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 25;
        
        if (examWindowText) {
          const examLine = `في الفترة: ${examWindowText}، وكان ${gradePronoun} فيه`;
          doc.text(shapeArabicText(examLine), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
          yPos += 18;
          
          doc.font('ArabicBold').fillColor('#c0392b').fontSize(14);
          doc.text(`( ${shapeArabicText(gradeWordAr)} )`, margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
          yPos += 25;
        }
        
        doc.font('Arabic').fontSize(11).fillColor('#333333');
        const regLine1 = `سُجلت هذه الشهادة تحت رقم ( ${certificateNumber} )`;
        doc.text(shapeArabicText(regLine1), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 16;
        
        const regLine2 = `بتاريخ: ${issueDateHijri} الموافق ${issueDateGreg}`;
        doc.text(shapeArabicText(regLine2), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
      } else {
        doc.font('Helvetica').fontSize(11).fillColor('#333333');
        doc.text(`The General Secretariat certifies that the student ${fullName}`, margin + 30, yPos, { width: contentWidth - 60 });
        yPos += 15;
        doc.text(`born in ${student.placeOfBirth || '______'} on ${dobFormatted}`, margin + 30, yPos, { width: contentWidth - 60 });
        yPos += 15;
        doc.text(`has completed the Higher Primary Stage at ${school.name}`, margin + 30, yPos, { width: contentWidth - 60 });
        yPos += 15;
        doc.text(`and passed the final examination with grade: ${finalGrade}`, margin + 30, yPos, { width: contentWidth - 60 });
        yPos += 25;
        doc.text(`Certificate Number: ${certificateNumber}`, margin + 30, yPos, { width: contentWidth - 60 });
        yPos += 15;
        doc.text(`Date: ${issueDateGreg}`, margin + 30, yPos, { width: contentWidth - 60 });
      }
      
      yPos = pageHeight - margin - 120;
      
      doc.font(hasArabicFont ? 'Arabic' : 'Helvetica').fontSize(9).fillColor('#333333');
      
      const sigBlockWidth = (contentWidth - 80) / 3;
      const sig1X = margin + 30;
      const sig2X = margin + 30 + sigBlockWidth + 20;
      const sig3X = margin + 30 + (sigBlockWidth + 20) * 2;
      
      if (hasArabicFont) {
        doc.text(shapeArabicText('توقيع رئيس الأمانة'), sig1X, yPos, { width: sigBlockWidth, align: 'center' });
        doc.text(shapeArabicText('الختم الرسمي'), sig2X, yPos, { width: sigBlockWidth, align: 'center' });
        doc.text(shapeArabicText('توقيع مدير المدرسة'), sig3X, yPos, { width: sigBlockWidth, align: 'center' });
      } else {
        doc.text('Secretariat Chairman', sig1X, yPos, { width: sigBlockWidth, align: 'center' });
        doc.text('Official Stamp', sig2X, yPos, { width: sigBlockWidth, align: 'center' });
        doc.text('School Director', sig3X, yPos, { width: sigBlockWidth, align: 'center' });
      }
      
      yPos += 20;
      doc.moveTo(sig1X, yPos).lineTo(sig1X + sigBlockWidth - 20, yPos).stroke('#666666');
      doc.moveTo(sig3X, yPos).lineTo(sig3X + sigBlockWidth - 20, yPos).stroke('#666666');
      
      if (qrDataUrl) {
        const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        doc.image(qrBuffer, margin + 30, pageHeight - margin - 100, { width: 70 });
        
        if (hasArabicFont) {
          doc.font('Arabic').fontSize(8).fillColor('#666666');
          doc.text(shapeArabicText('التحقق عبر QR'), margin + 30, pageHeight - margin - 25, { width: 70, align: 'center' });
        }
      }
      
      if (hasArabicFont) {
        doc.font('Arabic').fontSize(9).fillColor('#666666');
        doc.text(shapeArabicText('أي كشط أو تغيير في هذه الشهادة يلغيها'), margin, pageHeight - margin - 15, { width: contentWidth, align: 'center' });
      }
      
      if (isReprint && hasArabicFont) {
        doc.save();
        doc.translate(pageWidth / 2, pageHeight / 2);
        doc.rotate(-45);
        doc.font('ArabicBold').fontSize(60).fillColor('rgba(192, 57, 43, 0.1)');
        doc.text(shapeArabicText('إعادة طباعة'), -150, -30);
        doc.restore();
      }
      
      doc.end();
      
      stream.on('finish', () => {
        console.log(`[Certificate PDF] Successfully generated: ${filePath}`);
        resolve(filePath);
      });
      
      stream.on('error', (err) => {
        console.error(`[Certificate PDF] Stream error:`, err.message);
        reject(new Error(`Failed to generate certificate PDF: ${err.message}`));
      });
      
    } catch (error: any) {
      console.error(`[Certificate PDF] Generation error:`, error.message);
      reject(new Error(`Failed to generate certificate PDF: ${error.message}`));
    }
  });
}
