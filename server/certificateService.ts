import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
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
  
  // Support all grades with grade-specific templates and fallbacks
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

  const arabicText = `
    تشهد الأمانة العامة بأن ال${genderPrefix}/ ${fullName} ${birthVerb} في ${student.placeOfBirth || ''} بتاريخ: ${dobFormatted} قد ${completeVerb} دراسة ${gradeLevelAr} في مدرسة ${school.name} بعد أن ${passedVerb} في الامتحان النهائي الذي أشرفت عليه الأمانة العامة بالتنسيق مع وزارة التربية والتعليم في غامبيا.
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
          
          <div class="title-english">GAMBIA MADRASSAH ${gradeLevelEn.toUpperCase()} CERTIFICATE</div>
          <div class="title-arabic">شهادة إتمام دراسة ${gradeLevelAr}</div>
          
          <div class="content">
            تشهد الأمانة العامة بأن ال${genderPrefix}/ <span class="student-name">${fullName}</span> ${birthVerb} في <span class="cert-number">${student.placeOfBirth || ''}</span> بتاريخ: <span class="cert-number">${dobFormatted}</span> قد ${completeVerb} دراسة ${gradeLevelAr} في مدرسة <span class="school-name">${school.name}</span> بعد أن ${passedVerb} في الامتحان النهائي الذي أشرفت عليه الأمانة العامة بالتنسيق مع وزارة التربية والتعليم في غامبيا.
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
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
    await browser.close();
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
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
    await browser.close();
  }
}

export { generateCertificateNumber, generateQRToken };
