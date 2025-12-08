import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { getChromiumExecutable } from './chromiumHelper';
import {
  formatArabicDate,
  formatHijriDate,
  getGradeWord,
  generateCertificateNumber,
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
    examWindowText = `${startDay} ${startMonth} – ${endDay} ${endMonth} ,${examYear.year}`;
  }

  const gradeWordAr = getGradeWord(finalGrade);
  
  // Gender-specific text
  const isMale = student.gender === 'male';
  const studentLabel = isMale ? 'طالب' : 'طالبة';
  const birthLabel = isMale ? 'المولود' : 'المولودة';
  const completedVerb = isMale ? 'قدّ أتم' : 'قدّ أتمت';
  const successVerb = isMale ? 'نجح' : 'نجحت';
  const gradePronoun = isMale ? 'تقديره' : 'تقديرها';

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
        
        html, body {
          width: 100%;
          height: 100%;
        }
        
        body {
          font-family: 'Amiri', 'Noto Naskh Arabic', serif;
          direction: rtl;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .certificate-container {
          width: 1024px;
          height: 768px;
          position: relative;
          background: white;
          padding: 40px;
          box-sizing: border-box;
          overflow: hidden;
        }
        
        .certificate-border {
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          bottom: 20px;
          border: 4px double #8B6914;
          padding: 30px;
          box-sizing: border-box;
        }
        
        .certificate-content {
          position: relative;
          z-index: 2;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 15px;
        }
        
        .header-left {
          width: 40%;
          text-align: left;
          direction: ltr;
          font-size: 10px;
          line-height: 1.5;
          color: #333;
          font-family: Arial, sans-serif;
        }
        
        .header-center {
          width: 20%;
          text-align: center;
        }
        
        .header-right {
          width: 40%;
          text-align: right;
          font-size: 11px;
          line-height: 1.5;
          color: #333;
        }
        
        .bismillah {
          text-align: center;
          font-size: 18px;
          margin-bottom: 15px;
          color: #1a3a52;
          font-weight: bold;
        }
        
        .title-section {
          text-align: center;
          margin-bottom: 25px;
        }
        
        .title-english {
          font-size: 16px;
          font-weight: bold;
          color: #1a3a52;
          font-family: Arial, sans-serif;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        
        .title-arabic {
          font-size: 20px;
          font-weight: bold;
          color: #1a3a52;
        }
        
        .content-section {
          flex: 1;
          text-align: right;
          font-size: 14px;
          line-height: 1.8;
          color: #333;
        }
        
        .content-text {
          margin-bottom: 15px;
          text-align: justify;
        }
        
        .student-name {
          color: #c0392b;
          font-weight: bold;
        }
        
        .emphasis {
          color: #c0392b;
          font-weight: bold;
        }
        
        .registration-section {
          margin-top: 15px;
          font-size: 13px;
          line-height: 1.6;
          text-align: right;
        }
        
        .signature-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 40px;
          gap: 20px;
        }
        
        .signature-block {
          text-align: center;
          flex: 1;
          font-size: 11px;
          line-height: 1.4;
        }
        
        .signature-line {
          border-top: 1px solid #333;
          width: 100%;
          height: 30px;
          margin: 10px 0;
        }
        
        .qr-section {
          position: absolute;
          bottom: 50px;
          left: 40px;
          text-align: center;
        }
        
        .qr-code {
          width: 90px;
          height: 90px;
          background: white;
          padding: 5px;
          border: 1px solid #ccc;
        }
        
        .qr-code img {
          width: 100%;
          height: 100%;
        }
        
        .qr-label {
          font-size: 9px;
          margin-top: 5px;
          color: #666;
        }
        
        .footer-warning {
          text-align: center;
          font-size: 10px;
          color: #666;
          margin-top: 15px;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
        
        .reprint-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 120px;
          color: rgba(192, 57, 43, 0.08);
          font-weight: bold;
          z-index: 1;
          pointer-events: none;
          font-family: Arial, sans-serif;
          white-space: nowrap;
        }
      </style>
    </head>
    <body>
      <div class="certificate-container">
        ${isReprint ? '<div class="reprint-watermark">إعادة طباعة</div>' : ''}
        
        <div class="certificate-border">
          <div class="certificate-content">
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
                جمهوريــــــــــة غامبيــــــــــا<br>
                وزارة التربيـة و التعليم الأساسي<br>
                الأمانة العامة للتعليم الإسلامي العربي<br>
                في غامبيا
              </div>
            </div>
            
            <div class="title-section">
              <div class="title-english">GAMBIA MADRASSAH PRIMARY CERTIFICATE</div>
              <div class="title-arabic">شهادة إتمام دراسة المرحلة الابتدائية العليا</div>
            </div>
            
            <div class="content-section">
              <div class="content-text">
                تشهد الأمانة العامة بأن ال<span class="emphasis">${studentLabel}</span>/ 
                <span class="student-name">${fullName}</span> 
                ${birthLabel} في <span class="emphasis">${student.placeOfBirth || '______'}</span> 
                بتاريخ: <span class="emphasis">${dobFormatted}</span> 
                قد ${completedVerb} دراسة المرحلة الابتدائية العليا في مدرسة 
                <span class="emphasis">${school.name}</span> 
                بعد أن ${successVerb} في الامتحان النهائي الذي أشرفت عليه الأمانة العامة بالتنسيق مع وزارة التربية والتعليم في غامبيا.
              </div>
              
              <div class="content-text">
                في الفترة: <span class="emphasis">${examWindowText}</span>، 
                وكان ${gradePronoun} فيه ( <span class="emphasis">${gradeWordAr}</span> ).
              </div>
              
              <div class="registration-section">
                سُجلت هذه الشهادة تحت رقم ( <span class="emphasis">${certificateNumber}</span> ) 
                بتاريخ: <span class="emphasis">${issueDateHijri}</span> 
                الموافق <span class="emphasis">${issueDateGreg}</span>
              </div>
            </div>
            
            <div class="signature-section">
              <div class="signature-block">
                توقيع رئيس الأمانة<br>
                <div class="signature-line"></div>
                تصديق وزارة التربية والتعليم
              </div>
              <div class="signature-block">
                <div style="font-size: 13px; font-weight: bold;">الختم الرسمي</div>
              </div>
              <div class="signature-block">
                توقيع مدير المدرسة<br>
                <div class="signature-line"></div>
                تصديق جهة الإشراف على المدرسة
              </div>
            </div>
            
            <div class="qr-section">
              <div class="qr-code">
                <img src="${qrDataUrl}" alt="QR Code" />
              </div>
              <div class="qr-label">التحقق عبر QR</div>
            </div>
            
            <div class="footer-warning">
              أي كشط أو تغيير في هذه الشهادة يلغيها
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: getChromiumExecutable(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const fileName = `grade6_cert_${student.indexNumber || student.id}_${Date.now()}.pdf`;
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
