import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import {
  certificateTemplates,
  formatArabicDate,
  formatHijriDate,
  getGradeWord,
  generateCertificateNumber,
  generateQRToken,
  arabicMonths,
} from './certificateTemplates';

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
  
  if (![6, 9, 12].includes(student.grade)) {
    throw new Error(`Certificates can only be generated for grades 6, 9, and 12. Student is in grade ${student.grade}`);
  }

  const template = certificateTemplates[student.grade][student.gender];
  if (!template) {
    throw new Error(`No template found for grade ${student.grade} ${student.gender}`);
  }

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

  const arabicText = `
    تشهد الأمانة العامة بأن ال${genderPrefix}/ ${fullName} ${birthVerb} في ${student.placeOfBirth || ''} بتاريخ: ${dobFormatted} قد ${completeVerb} دراسة المرحلة الابتدائية في مدرسة ${school.name} بعد أن ${passedVerb} في الامتحان النهائي الذي أشرفت عليه الأمانة العامة بالتنسيق مع وزارة التربية والتعليم في غامبيا.
    ${examWindowText}، وكان ${gradeResult} فيه ${gradeWordAr}.
    سُجلت هذه الشهادة تحت رقم (${certificateNumber}) بتاريخ: ${issueDateHijri} الموافق ${issueDateGreg}
  `;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Amiri', 'Noto Naskh Arabic', serif;
          direction: rtl;
          text-align: right;
        }
        
        .certificate {
          width: 842px;
          height: 595px;
          position: relative;
          background: white;
          padding: 20px;
          overflow: hidden;
        }
        
        .border-frame {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          bottom: 10px;
          border: 3px double #8B4513;
          padding: 15px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
        }
        
        .header-left, .header-right {
          width: 40%;
          font-size: 11px;
          line-height: 1.4;
        }
        
        .header-left {
          text-align: left;
          direction: ltr;
        }
        
        .header-right {
          text-align: right;
        }
        
        .bismillah {
          text-align: center;
          font-size: 18px;
          margin-bottom: 10px;
          color: #1a5276;
        }
        
        .title-english {
          text-align: center;
          font-size: 16px;
          font-weight: bold;
          color: #1a5276;
          margin-bottom: 5px;
          font-family: Arial, sans-serif;
        }
        
        .title-arabic {
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          color: #1a5276;
          margin-bottom: 20px;
        }
        
        .content {
          text-align: right;
          font-size: 14px;
          line-height: 2;
          padding: 0 30px;
        }
        
        .student-name {
          font-weight: bold;
          color: #c0392b;
          font-size: 16px;
        }
        
        .school-name {
          color: #c0392b;
        }
        
        .grade-word {
          font-weight: bold;
          color: #c0392b;
          font-size: 16px;
        }
        
        .cert-number {
          color: #c0392b;
        }
        
        .registration-line {
          margin-top: 15px;
          font-size: 13px;
        }
        
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 40px;
          padding: 0 40px;
          font-size: 12px;
        }
        
        .signature-block {
          text-align: center;
        }
        
        .signature-line {
          border-top: 1px dotted #333;
          width: 150px;
          margin: 10px auto 5px;
        }
        
        .qr-code {
          position: absolute;
          bottom: 60px;
          left: 40px;
        }
        
        .qr-code img {
          width: 70px;
          height: 70px;
        }
        
        .footer-note {
          text-align: center;
          font-size: 11px;
          color: #666;
          margin-top: 20px;
        }
        
        .reprint-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 80px;
          color: rgba(192, 57, 43, 0.15);
          font-weight: bold;
          z-index: 1;
          pointer-events: none;
        }
        
        .official-stamp {
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          font-size: 11px;
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        ${isReprint ? '<div class="reprint-watermark">إعادة طباعة</div>' : ''}
        <div class="border-frame">
          <div class="bismillah">بسم الله الرحمن الرحيم</div>
          
          <div class="header">
            <div class="header-left">
              THE REPUBLIC OF THE GAMBIA<br>
              DEPARTMENT OF STATE FOR-<br>
              BASIC AND SECONDARY<br>
              EDUCATION<br>
              The General Secretariat for Islamic/<br>
              Arabic Education<br>
              In The Gambia
            </div>
            <div class="header-right">
              جمهوريــــــــــة غامبيـــــــــا<br>
              وزارة التربيـة و التعليم الأساسي<br>
              الأمانة العامة للتعليم الإسلامي العربي<br>
              في غامبيا
            </div>
          </div>
          
          <div class="title-english">GAMBIA MADRASSAH PRIMARY CERTIFICATE</div>
          <div class="title-arabic">شهادة إتمام دراسة المرحلة الابتدائية</div>
          
          <div class="content">
            تشهد الأمانة العامة بأن ال${genderPrefix}/ <span class="student-name">${fullName}</span> ${birthVerb} في <span class="cert-number">${student.placeOfBirth || ''}</span> بتاريخ: <span class="cert-number">${dobFormatted}</span> قد ${completeVerb} دراسة المرحلة الابتدائية في مدرسة <span class="school-name">${school.name}</span> بعد أن ${passedVerb} في الامتحان النهائي الذي أشرفت عليه الأمانة العامة بالتنسيق مع وزارة التربية والتعليم في غامبيا.
            <br>
            <span class="cert-number">${examWindowText}</span>، وكان ${gradeResult} فيه <span class="grade-word">${gradeWordAr}</span>.
            
            <div class="registration-line">
              سُجلت هذه الشهادة تحت رقم (<span class="cert-number">${certificateNumber}</span>) بتاريخ: <span class="cert-number">${issueDateHijri}</span> الموافق <span class="cert-number">${issueDateGreg}</span>
            </div>
          </div>
          
          <div class="signatures">
            <div class="signature-block">
              توقيع رئيس الأمانة<br>
              <div class="signature-line"></div>
              تصديق وزارة التربية والتعليم
            </div>
            <div class="signature-block">
              الختم الرسمي
            </div>
            <div class="signature-block">
              توقيع مدير المدرسة<br>
              <div class="signature-line"></div>
              تصديق جهة الإشراف على المدرسة
            </div>
          </div>
          
          <div class="qr-code">
            <img src="${qrDataUrl}" alt="QR Code">
          </div>
          
          <div class="footer-note">
            أي كشط أو تغيير في هذه الشهادة يلغيها
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const fileName = `cert_${student.indexNumber || student.id}_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });
    
    return filePath;
  } finally {
    await browser.close();
  }
}

interface TranscriptSubject {
  name: string;
  arabicName: string | null;
  score: number;
  grade: string;
  maxScore: number;
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
  const { student, school, examYear, subjects, totalScore, average, finalGrade, qrToken, transcriptNumber, verifyUrl, isReprint } = data;

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 100,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  });

  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');

  const issueDate = new Date();
  const issueDateFormatted = formatArabicDate(issueDate);

  const subjectRows = subjects.map((subject, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${subject.arabicName || subject.name}</td>
      <td>${subject.name}</td>
      <td>${subject.score}</td>
      <td>${subject.maxScore}</td>
      <td>${subject.grade}</td>
    </tr>
  `).join('');

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
          font-size: 12px;
          padding: 20px;
        }
        
        .transcript {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          position: relative;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #1a5276;
          padding-bottom: 15px;
        }
        
        .bismillah {
          font-size: 16px;
          margin-bottom: 10px;
        }
        
        .title {
          font-size: 20px;
          font-weight: bold;
          color: #1a5276;
          margin: 10px 0;
        }
        
        .sub-title {
          font-size: 14px;
          color: #333;
        }
        
        .student-info {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
        }
        
        .info-item {
          flex: 1 1 200px;
        }
        
        .info-label {
          font-weight: bold;
          color: #666;
        }
        
        .info-value {
          color: #c0392b;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: center;
        }
        
        th {
          background: #1a5276;
          color: white;
        }
        
        tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        .summary {
          display: flex;
          justify-content: space-around;
          padding: 15px;
          background: #1a5276;
          color: white;
          margin: 20px 0;
          border-radius: 5px;
        }
        
        .summary-item {
          text-align: center;
        }
        
        .summary-value {
          font-size: 18px;
          font-weight: bold;
        }
        
        .qr-section {
          position: absolute;
          bottom: 20px;
          left: 20px;
        }
        
        .qr-section img {
          width: 60px;
          height: 60px;
        }
        
        .footer {
          text-align: center;
          margin-top: 30px;
          font-size: 10px;
          color: #666;
        }
        
        .reprint-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 60px;
          color: rgba(192, 57, 43, 0.15);
          font-weight: bold;
          z-index: 1;
          pointer-events: none;
        }
      </style>
    </head>
    <body>
      <div class="transcript">
        ${isReprint ? '<div class="reprint-watermark">إعادة طباعة</div>' : ''}
        
        <div class="header">
          <div class="bismillah">بسم الله الرحمن الرحيم</div>
          <div class="title">كشف الدرجات / TRANSCRIPT OF RESULTS</div>
          <div class="sub-title">الأمانة العامة للتعليم الإسلامي العربي في غامبيا</div>
          <div class="sub-title">The General Secretariat for Islamic/Arabic Education - The Gambia</div>
        </div>
        
        <div class="student-info">
          <div class="info-item">
            <span class="info-label">اسم الطالب / Student Name:</span>
            <span class="info-value">${fullName}</span>
          </div>
          <div class="info-item">
            <span class="info-label">رقم القيد / Index Number:</span>
            <span class="info-value">${student.indexNumber || 'N/A'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">المدرسة / School:</span>
            <span class="info-value">${school.name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">الصف / Grade:</span>
            <span class="info-value">${student.grade}</span>
          </div>
          <div class="info-item">
            <span class="info-label">العام الدراسي / Exam Year:</span>
            <span class="info-value">${examYear.year}</span>
          </div>
          <div class="info-item">
            <span class="info-label">رقم الكشف / Transcript No:</span>
            <span class="info-value">${transcriptNumber}</span>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>المادة (عربي)</th>
              <th>Subject (English)</th>
              <th>الدرجة / Score</th>
              <th>من / Out of</th>
              <th>التقدير / Grade</th>
            </tr>
          </thead>
          <tbody>
            ${subjectRows}
          </tbody>
        </table>
        
        <div class="summary">
          <div class="summary-item">
            <div>المجموع الكلي</div>
            <div class="summary-value">${totalScore}</div>
          </div>
          <div class="summary-item">
            <div>المعدل</div>
            <div class="summary-value">${average.toFixed(2)}%</div>
          </div>
          <div class="summary-item">
            <div>التقدير العام</div>
            <div class="summary-value">${getGradeWord(finalGrade)}</div>
          </div>
        </div>
        
        <div class="qr-section">
          <img src="${qrDataUrl}" alt="QR Code">
          <div style="font-size: 8px; text-align: center;">امسح للتحقق</div>
        </div>
        
        <div class="footer">
          تاريخ الإصدار: ${issueDateFormatted}<br>
          أي كشط أو تغيير في هذا الكشف يلغيه
        </div>
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const fileName = `transcript_${student.indexNumber || student.id}_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    
    return filePath;
  } finally {
    await browser.close();
  }
}

export { generateCertificateNumber, generateQRToken };
