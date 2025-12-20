import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { shapeArabicText } from './arabicTextHelper';
import {
  certificateTemplates,
  getCertificateTemplate,
  getGradeLevelNameArabic,
  getGradeLevelNameEnglish,
  formatArabicDate,
  formatHijriDate,
  getGradeWord,
  generateCertificateNumber,
  generateQRToken,
  arabicMonths,
} from './certificateTemplates';
import { gradeTranscriptConfigs, getGradeConfig, getGradeLabelArabic, isEnglishSubject } from './transcriptTemplates';
import { generateGrade6CertificatePDF } from './grade6CertificateService';

// Font paths for pdfkit
const FONT_REGULAR = path.resolve(process.cwd(), 'fonts', 'Amiri-Regular.ttf');
const FONT_BOLD = path.resolve(process.cwd(), 'fonts', 'Amiri-Bold.ttf');


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

interface CertificateData {
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

const outputDir = path.join(process.cwd(), 'generated_certificates');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

export async function generateCertificatePDF(data: CertificateData): Promise<string> {
  const { student, school, examYear, finalGrade, qrToken, certificateNumber, verifyUrl, isReprint } = data;
  
  // Use specialized Grade 6 certificate template
  if (student.grade === 6) {
    return generateGrade6CertificatePDF({
      student,
      school,
      examYear,
      finalGrade,
      qrToken,
      certificateNumber,
      verifyUrl,
      isReprint
    });
  }
  
  // Support all other grades with grade-specific templates and fallbacks
  const template = getCertificateTemplate(student.grade, student.gender);
  
  // Get grade level names for the certificate with fallbacks
  const gradeLevelAr = getGradeLevelNameArabic(student.grade);
  const gradeLevelEn = getGradeLevelNameEnglish(student.grade);

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: template.qr.width * 2,
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
    examWindowText = `الفترة: ${startDay} ${startMonth} – ${endDay} ${endMonth}, ${examYear.year}`;
  }

  const gradeWordAr = `(${getGradeWord(finalGrade)})`;
  const genderPrefix = student.gender === 'male' ? 'طالب' : 'طالبة';
  const birthVerb = student.gender === 'male' ? 'المولود' : 'المولودة';
  const completeVerb = student.gender === 'male' ? 'أتم' : 'أتمت';
  const passedVerb = student.gender === 'male' ? 'نجح' : 'نجحت';
  const gradeResult = student.gender === 'male' ? 'تقديره' : 'تقديرها';

  return new Promise((resolve, reject) => {
    try {
      const fileName = `cert_${student.indexNumber || student.id}_${Date.now()}.pdf`;
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
        .lineWidth(3).stroke('#8B4513');
      doc.rect(margin + 8, margin + 8, contentWidth - 16, pageHeight - (margin * 2) - 16)
        .lineWidth(1).stroke('#8B4513');
      
      let yPos = margin + 25;
      
      if (hasArabicFont) {
        doc.font('ArabicBold').fontSize(16).fillColor('#1a5276');
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
      
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1a5276');
      doc.text(`GAMBIA MADRASSAH ${gradeLevelEn.toUpperCase()} CERTIFICATE`, margin, yPos, { width: contentWidth, align: 'center' });
      yPos += 22;
      
      if (hasArabicFont) {
        doc.font('ArabicBold').fontSize(18).fillColor('#1a5276');
        doc.text(shapeArabicText(`شهادة إتمام دراسة ${gradeLevelAr}`), margin, yPos, { width: contentWidth, align: 'center' });
      }
      yPos += 35;
      
      if (hasArabicFont) {
        doc.font('Arabic').fontSize(12).fillColor('#333333');
        
        const line1 = `تشهد الأمانة العامة بأن ال${genderPrefix}`;
        doc.text(shapeArabicText(line1), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        
        doc.font('ArabicBold').fillColor('#c0392b');
        doc.text(shapeArabicText(fullName), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        
        doc.font('Arabic').fillColor('#333333');
        const line2 = `${birthVerb} في ${student.placeOfBirth || '______'} بتاريخ: ${dobFormatted}`;
        doc.text(shapeArabicText(line2), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        
        const line3 = `قد ${completeVerb} دراسة ${gradeLevelAr} في مدرسة`;
        doc.text(shapeArabicText(line3), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        
        doc.font('ArabicBold').fillColor('#c0392b');
        doc.text(shapeArabicText(school.name), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        
        doc.font('Arabic').fillColor('#333333');
        const line4 = `بعد أن ${passedVerb} في الامتحان النهائي الذي أشرفت عليه الأمانة العامة`;
        doc.text(shapeArabicText(line4), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 18;
        
        doc.text(shapeArabicText('بالتنسيق مع وزارة التربية والتعليم في غامبيا.'), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
        yPos += 25;
        
        if (examWindowText) {
          const examLine = `${examWindowText}، وكان ${gradeResult} فيه`;
          doc.text(shapeArabicText(examLine), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
          yPos += 18;
          
          doc.font('ArabicBold').fillColor('#c0392b').fontSize(14);
          doc.text(shapeArabicText(gradeWordAr), margin + 30, yPos, { width: contentWidth - 60, align: 'right' });
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
        doc.text(`has completed ${gradeLevelEn} at ${school.name}`, margin + 30, yPos, { width: contentWidth - 60 });
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
      }
      
      if (hasArabicFont) {
        doc.font('Arabic').fontSize(9).fillColor('#666666');
        doc.text(shapeArabicText('أي كشط أو تغيير في هذه الشهادة يلغيها'), margin, pageHeight - margin - 15, { width: contentWidth, align: 'center' });
      }
      
      if (isReprint && hasArabicFont) {
        doc.save();
        doc.translate(pageWidth / 2, pageHeight / 2);
        doc.rotate(-45);
        doc.font('ArabicBold').fontSize(50).fillColor('rgba(192, 57, 43, 0.1)');
        doc.text(shapeArabicText('إعادة طباعة'), -120, -25);
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

interface TranscriptSubject {
  name: string;
  arabicName: string | null;
  score: number;
  grade: string;
  maxScore: number;
  passingScore?: number;
}

interface TranscriptData {
  student: StudentData;
  school: SchoolData;
  examYear: ExamYearData;
  subjects: TranscriptSubject[];
  totalScore: number;
  average: number;
  finalGrade: string;
  qrToken: string;
  transcriptNumber: string;
  verifyUrl: string;
  isReprint?: boolean;
}

export async function generateTranscriptPDF(data: TranscriptData): Promise<string> {
  const { student, school, examYear, subjects, totalScore, average, finalGrade, transcriptNumber, verifyUrl, isReprint } = data;

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 80,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  });

  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');

  // Use helper functions with proper fallbacks for all grades
  const gradeConfig = getGradeConfig(student.grade);
  const gradeLabel = getGradeLabelArabic(student.grade);

  const subjectRows = subjects.map((subject, index) => {
    const subjectName = subject.arabicName || subject.name;
    const isEnglish = isEnglishSubject(subjectName);
    
    return `
    <tr>
      <td class="score-cell">${subject.score || ''}</td>
      <td class="score-cell">${subject.passingScore || 50}</td>
      <td class="score-cell">${subject.maxScore || 100}</td>
      <td class="${isEnglish ? 'subject-cell ltr-text' : 'subject-cell'}">${subjectName}</td>
      <td class="num-cell">${index + 1}</td>
    </tr>
  `;}).join('');

  const maxPossibleScore = subjects.length * 100;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          font-family: 'Amiri', 'Noto Naskh Arabic', serif;
          font-size: 13px;
          direction: rtl;
          background: white;
        }
        
        .transcript-page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          position: relative;
          background: white;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          border-bottom: 2px solid #1E8F4D;
          padding-bottom: 15px;
        }
        
        .header-left {
          text-align: left;
          direction: ltr;
          font-size: 11px;
          line-height: 1.5;
          width: 35%;
        }
        
        .header-right {
          text-align: right;
          font-size: 12px;
          line-height: 1.6;
          width: 35%;
        }
        
        .header-center {
          text-align: center;
          width: 30%;
        }
        
        .org-title {
          font-weight: bold;
          color: #0F5A2F;
        }
        
        .dept-title {
          color: #1E8F4D;
          font-weight: bold;
          margin-top: 8px;
        }
        
        .student-info {
          margin: 15px 0;
          padding: 10px 15px;
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        
        .info-row {
          display: flex;
          margin: 8px 0;
          font-size: 14px;
        }
        
        .info-label {
          font-weight: bold;
          min-width: 120px;
        }
        
        .info-value {
          color: #0F5A2F;
          flex: 1;
          border-bottom: 1px dotted #999;
          padding-bottom: 2px;
        }
        
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 13px;
        }
        
        .results-table th {
          background: #1E8F4D;
          color: white;
          padding: 10px 8px;
          border: 1px solid #0F5A2F;
          font-weight: bold;
        }
        
        .results-table td {
          padding: 8px;
          border: 1px solid #ddd;
          text-align: center;
        }
        
        .results-table tbody tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        .subject-cell {
          text-align: right;
          padding-right: 15px !important;
        }
        
        .ltr-text {
          direction: ltr;
          text-align: left;
          padding-left: 15px !important;
          padding-right: 8px !important;
        }
        
        .num-cell {
          width: 40px;
          font-weight: bold;
        }
        
        .score-cell {
          width: 80px;
        }
        
        .summary-row {
          background: #e8f5e9 !important;
          font-weight: bold;
        }
        
        .summary-row td {
          border-top: 2px solid #1E8F4D;
        }
        
        .footer-section {
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
          padding-top: 15px;
        }
        
        .signature-block {
          text-align: center;
          width: 45%;
        }
        
        .signature-title {
          font-weight: bold;
          margin-bottom: 40px;
        }
        
        .signature-line {
          border-top: 1px dotted #333;
          width: 150px;
          margin: 0 auto;
        }
        
        .qr-section {
          position: absolute;
          bottom: 20mm;
          left: 20mm;
          text-align: center;
        }
        
        .qr-section img {
          width: 60px;
          height: 60px;
        }
        
        .qr-label {
          font-size: 9px;
          color: #666;
          margin-top: 3px;
        }
        
        .reprint-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 70px;
          color: rgba(30, 143, 77, 0.12);
          font-weight: bold;
          pointer-events: none;
          z-index: 1;
        }
        
        .grade-indicator {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          color: #1E8F4D;
          margin: 10px 0;
          padding: 8px;
          background: #e8f5e9;
          border-radius: 5px;
        }
      </style>
    </head>
    <body>
      <div class="transcript-page">
        ${isReprint ? '<div class="reprint-watermark">إعادة طباعة</div>' : ''}
        
        <div class="header">
          <div class="header-left">
            <div class="org-title">The General Secretariat for</div>
            <div>Islamic/Arabic Education in</div>
            <div>The Gambia</div>
            <div class="dept-title" style="margin-top: 10px;">Examination affairs unit</div>
          </div>
          <div class="header-center">
            <!-- Logo placeholder -->
          </div>
          <div class="header-right">
            <div class="org-title">الأمانة العامة للتعليم الإسلامي العربي</div>
            <div>في غامبيا</div>
            <div class="dept-title">قسم الامتحانات</div>
          </div>
        </div>
        
        <div class="grade-indicator">
          ${gradeConfig?.certificateTitleArabic || 'كشف الدرجات'} - ${gradeLabel}
        </div>
        
        <div class="student-info">
          <div class="info-row">
            <span class="info-label">اسم الطالب\\ة:</span>
            <span class="info-value">${fullName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">الجنسية:</span>
            <span class="info-value">${student.placeOfBirth || 'غامبية'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">المدرسة:</span>
            <span class="info-value">${school.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">رقم القيد:</span>
            <span class="info-value">${student.indexNumber || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">العام الدراسي:</span>
            <span class="info-value">${examYear.year}</span>
          </div>
        </div>
        
        <table class="results-table">
          <thead>
            <tr>
              <th colspan="3">الدرجات المكتسبة</th>
              <th rowspan="2">المادة</th>
              <th rowspan="2">م</th>
            </tr>
            <tr>
              <th>رقماً</th>
              <th>الصغرى</th>
              <th>الكبرى</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRows}
            <tr class="summary-row">
              <td>${totalScore}</td>
              <td colspan="2">مجموع الدرجات</td>
              <td colspan="2"></td>
            </tr>
            <tr class="summary-row">
              <td>${average.toFixed(1)}%</td>
              <td colspan="2">النسبة</td>
              <td colspan="2"></td>
            </tr>
            <tr class="summary-row">
              <td>${getGradeWord(finalGrade)}</td>
              <td colspan="2">التقدير</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer-section">
          <div class="signature-block">
            <div class="signature-title">توقيع إدارة الأمانة</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-block">
            <div class="signature-title">توقيع رئيس لجنة الامتحانات</div>
            <div class="signature-line"></div>
          </div>
        </div>
        
        <div class="qr-section">
          <img src="${qrDataUrl}" alt="QR Code">
          <div class="qr-label">امسح للتحقق</div>
          <div class="qr-label">${transcriptNumber}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Use shared browser for performance
  const browser = await getSharedBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const fileName = `transcript_${student.indexNumber || student.id}_g${student.grade}_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    
    return filePath;
  } finally {
    await page.close();
  }
}

// Result Slip PDF Generation for public result checker
interface ResultSlipData {
  student: {
    indexNumber: string | null;
    fullName: string;
    schoolEn: string;
    schoolAr: string;
    grade: number;
    levelEn: string;
    levelAr: string;
    examYear: string;
  };
  results: Array<{
    subjectEn: string;
    subjectAr: string;
    score: number;
    maxScore: number;
    grade: string;
    status: string;
    statusAr: string;
  }>;
  summary: {
    totalScore: number;
    maxPossibleScore: number;
    averageScore: number;
    subjectCount: number;
    passedCount: number;
    failedCount: number;
  };
  overallStatus: string;
  overallStatusAr: string;
}

export async function generateResultSlipPDF(data: ResultSlipData): Promise<string> {
  const { student, results, summary, overallStatus, overallStatusAr } = data;

  const resultRows = results.map((result, index) => `
    <tr>
      <td class="num-cell">${index + 1}</td>
      <td class="subject-cell-ar">${result.subjectAr}</td>
      <td class="subject-cell-en">${result.subjectEn}</td>
      <td class="score-cell">${result.score}</td>
      <td class="grade-cell ${result.grade === 'A' || result.grade === 'B' ? 'grade-pass' : result.grade === 'F' ? 'grade-fail' : ''}">${result.grade}</td>
      <td class="status-cell ${result.status === 'PASSED' ? 'status-pass' : 'status-fail'}">${result.status} / ${result.statusAr}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 11pt;
          line-height: 1.4;
          background: #fff;
          padding: 20px;
        }
        
        .container {
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          border: 2px solid #1E8F4D;
          border-radius: 8px;
          overflow: hidden;
        }
        
        .header {
          background: linear-gradient(135deg, #1E8F4D 0%, #0F5A2F 100%);
          color: white;
          padding: 20px;
          text-align: center;
        }
        
        .header h1 {
          font-size: 22pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .header h2 {
          font-family: 'Amiri', 'Noto Naskh Arabic', serif;
          font-size: 20pt;
          margin-bottom: 10px;
          direction: rtl;
        }
        
        .header .subtitle {
          font-size: 10pt;
          opacity: 0.9;
        }
        
        .header .title-badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 8px 20px;
          border-radius: 20px;
          margin-top: 10px;
          font-size: 12pt;
          font-weight: bold;
        }
        
        .content {
          padding: 20px;
        }
        
        .student-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8faf8;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
        }
        
        .info-label {
          font-size: 9pt;
          color: #666;
          margin-bottom: 3px;
        }
        
        .info-value {
          font-size: 11pt;
          font-weight: 600;
          color: #333;
        }
        
        .info-value-ar {
          font-family: 'Amiri', 'Noto Naskh Arabic', serif;
          direction: rtl;
          text-align: right;
        }
        
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .results-table th {
          background: #1E8F4D;
          color: white;
          padding: 10px 8px;
          text-align: center;
          font-weight: 600;
        }
        
        .results-table td {
          padding: 8px;
          border-bottom: 1px solid #e0e0e0;
          text-align: center;
        }
        
        .results-table tr:nth-child(even) {
          background: #f8faf8;
        }
        
        .results-table tr:hover {
          background: #e8f5e9;
        }
        
        .num-cell {
          width: 30px;
          font-weight: bold;
          color: #666;
        }
        
        .subject-cell-ar {
          font-family: 'Amiri', 'Noto Naskh Arabic', serif;
          direction: rtl;
          text-align: right;
          font-size: 11pt;
        }
        
        .subject-cell-en {
          text-align: left;
        }
        
        .score-cell {
          font-weight: bold;
          font-size: 11pt;
        }
        
        .grade-cell {
          font-weight: bold;
          font-size: 12pt;
        }
        
        .grade-pass {
          color: #1E8F4D;
        }
        
        .grade-fail {
          color: #dc3545;
        }
        
        .status-pass {
          color: #1E8F4D;
          font-weight: 600;
        }
        
        .status-fail {
          color: #dc3545;
          font-weight: 600;
        }
        
        .summary-section {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .summary-card {
          text-align: center;
          padding: 15px;
          border-radius: 8px;
          background: #f8faf8;
          border: 1px solid #e0e0e0;
        }
        
        .summary-card.total {
          background: linear-gradient(135deg, #1E8F4D 0%, #0F5A2F 100%);
          color: white;
          border: none;
        }
        
        .summary-card.passed {
          border-color: #1E8F4D;
        }
        
        .summary-card.failed {
          border-color: #dc3545;
        }
        
        .summary-value {
          font-size: 20pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .summary-card.passed .summary-value {
          color: #1E8F4D;
        }
        
        .summary-card.failed .summary-value {
          color: #dc3545;
        }
        
        .summary-label {
          font-size: 9pt;
          color: #666;
        }
        
        .summary-card.total .summary-label {
          color: rgba(255,255,255,0.8);
        }
        
        .overall-result {
          text-align: center;
          padding: 20px;
          background: ${overallStatus === 'PASSED' ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)'};
          border-radius: 8px;
          margin-bottom: 20px;
          border: 2px solid ${overallStatus === 'PASSED' ? '#1E8F4D' : '#dc3545'};
        }
        
        .overall-result h3 {
          font-size: 16pt;
          color: ${overallStatus === 'PASSED' ? '#1E8F4D' : '#dc3545'};
          margin-bottom: 5px;
        }
        
        .overall-result .ar {
          font-family: 'Amiri', 'Noto Naskh Arabic', serif;
          font-size: 18pt;
          color: ${overallStatus === 'PASSED' ? '#0F5A2F' : '#c62828'};
        }
        
        .footer {
          text-align: center;
          padding: 15px;
          background: #f5f5f5;
          border-top: 1px solid #e0e0e0;
          font-size: 9pt;
          color: #666;
        }
        
        .footer .date {
          font-weight: 600;
          margin-bottom: 5px;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 80pt;
          color: rgba(30, 143, 77, 0.05);
          font-weight: bold;
          pointer-events: none;
          z-index: -1;
        }
      </style>
    </head>
    <body>
      <div class="watermark">AMAANAH</div>
      <div class="container">
        <div class="header">
          <h2>الأمانة العامة للتعليم الإسلامي والعربي</h2>
          <h1>AMAANAH - General Secretariat for Islamic & Arabic Education</h1>
          <div class="subtitle">The Gambia | غامبيا</div>
          <div class="title-badge">EXAMINATION RESULT SLIP / كشف نتائج الامتحان</div>
        </div>
        
        <div class="content">
          <div class="student-info">
            <div class="info-item">
              <span class="info-label">Index Number / رقم الجلوس</span>
              <span class="info-value">${student.indexNumber || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Candidate Name / اسم المرشح</span>
              <span class="info-value">${student.fullName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">School / المدرسة</span>
              <span class="info-value">${student.schoolEn}</span>
              <span class="info-value info-value-ar">${student.schoolAr}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Grade Level / المستوى</span>
              <span class="info-value">${student.levelEn}</span>
              <span class="info-value info-value-ar">${student.levelAr}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Exam Year / سنة الامتحان</span>
              <span class="info-value">${student.examYear}</span>
            </div>
          </div>
          
          <table class="results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>المادة (Arabic)</th>
                <th>Subject (English)</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Status / الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${resultRows}
            </tbody>
          </table>
          
          <div class="summary-section">
            <div class="summary-card total">
              <div class="summary-value">${summary.averageScore}%</div>
              <div class="summary-label">Average / المعدل</div>
            </div>
            <div class="summary-card passed">
              <div class="summary-value">${summary.passedCount}</div>
              <div class="summary-label">Passed / ناجح</div>
            </div>
            <div class="summary-card failed">
              <div class="summary-value">${summary.failedCount}</div>
              <div class="summary-label">Failed / راسب</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${summary.totalScore}/${summary.maxPossibleScore}</div>
              <div class="summary-label">Total Score / المجموع</div>
            </div>
          </div>
          
          <div class="overall-result">
            <h3>OVERALL RESULT: ${overallStatus}</h3>
            <div class="ar">النتيجة النهائية: ${overallStatusAr}</div>
          </div>
        </div>
        
        <div class="footer">
          <div class="date">Generated on: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
          <div>This is an unofficial result slip. For official certificates, please contact AMAANAH office.</div>
          <div>هذا كشف نتائج غير رسمي. للحصول على الشهادات الرسمية، يرجى التواصل مع مكتب الأمانة.</div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Use shared browser for performance
  const browser = await getSharedBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const fileName = `result_slip_${student.indexNumber || 'unknown'}_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    
    return filePath;
  } finally {
    await page.close();
  }
}

export { generateCertificateNumber, generateQRToken };
