import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import {
  formatArabicDate,
  formatHijriDate,
  getGradeWord,
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
  address?: string | null;
}

interface ExamYearData {
  id: number;
  year: number;
  hijriYear?: string | null;
  examStartDate: Date | null;
  examEndDate: Date | null;
}

interface PrimaryCertificateData {
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

function generateMaleCertificateHTML(data: PrimaryCertificateData, qrDataUrl: string): string {
  const { student, school, examYear, finalGrade, certificateNumber, isReprint } = data;
  
  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');

  const dobFormatted = student.dateOfBirth 
    ? formatArabicDate(new Date(student.dateOfBirth))
    : '';
  
  const issueDate = new Date();
  const issueDateGreg = formatArabicDate(issueDate);
  const issueDateHijri = formatHijriDate(issueDate);

  const academicYear = `${examYear.year}/${examYear.year + 1}`;
  const gradeWordAr = getGradeWord(finalGrade);
  const schoolWithAddress = school.address ? `${school.name} - ${school.address}` : school.name;

  return `
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
          background: white;
        }
        
        .certificate {
          width: 842px;
          height: 595px;
          position: relative;
          background: white;
          padding: 15px;
          overflow: hidden;
        }
        
        .border-frame {
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          bottom: 8px;
          border: 3px double #1a5276;
          padding: 10px 15px;
        }
        
        .bismillah {
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          color: #000;
          margin-bottom: 8px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }
        
        .header-left {
          width: 38%;
          text-align: left;
          direction: ltr;
          font-size: 10px;
          line-height: 1.4;
          font-family: Arial, sans-serif;
        }
        
        .header-right {
          width: 38%;
          text-align: right;
          font-size: 12px;
          line-height: 1.5;
        }
        
        .header-center {
          width: 24%;
          text-align: center;
        }
        
        .title-english {
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          color: #000;
          margin-bottom: 5px;
          font-family: Arial, sans-serif;
          letter-spacing: 1px;
        }
        
        .title-arabic {
          text-align: center;
          font-size: 22px;
          font-weight: bold;
          color: #000;
          margin-bottom: 15px;
        }
        
        .content {
          text-align: right;
          font-size: 15px;
          line-height: 2.2;
          padding: 0 20px;
        }
        
        .highlight {
          color: #000;
        }
        
        .registration-line {
          margin-top: 12px;
          font-size: 14px;
        }
        
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 35px;
          padding: 0 30px;
          font-size: 11px;
        }
        
        .signature-block {
          text-align: center;
          width: 30%;
        }
        
        .signature-line {
          border-top: 1px dotted #333;
          width: 120px;
          margin: 30px auto 5px;
        }
        
        .signature-label {
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        .stamp-label {
          font-weight: bold;
          margin-top: 40px;
        }
        
        .qr-code {
          position: absolute;
          bottom: 40px;
          left: 30px;
        }
        
        .qr-code img {
          width: 65px;
          height: 65px;
        }
        
        .qr-label {
          font-size: 8px;
          color: #666;
          text-align: center;
          margin-top: 2px;
          direction: ltr;
        }
        
        .reprint-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 70px;
          color: rgba(192, 57, 43, 0.12);
          font-weight: bold;
          z-index: 1;
          pointer-events: none;
        }
        
        .validation-footer {
          display: flex;
          justify-content: space-between;
          padding: 0 30px;
          font-size: 10px;
          margin-top: 8px;
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
              EDUCATON<br>
              The General Secretariat for Islamic/<br>
              Arabic Education<br>
              In The Gambia
            </div>
            <div class="header-center"></div>
            <div class="header-right">
              جمهوريـــــــــــــــــــــة غامبيــــــــــا<br>
              وزارة التربيـة و التعليم الأساسي<br>
              الأمانة العامة للتعليم الإسلامي العربي<br>
              في غامبيا
            </div>
          </div>
          
          <div class="title-english">GAMBIA MADRASSAH PRIMARY CERTIFICATE</div>
          <div class="title-arabic">شهادة إتمام دراسة المرحلة الابتدائية</div>
          
          <div class="content">
            تشهد الأمانة العامة بأن الطالب/ <span class="highlight">${fullName}</span> المولود في <span class="highlight">${student.placeOfBirth || ''}</span> بتاريخ: <span class="highlight">${dobFormatted}</span> قد أتم دراسة المرحلة الابتدائية في <span class="highlight">${schoolWithAddress}</span> بعد أن نجح في الامتحان النهائي الذي أشرفت عليه الأمانة العامة بالتنسيق مع وزارة التربية والتعليم في غامبيا.
            <br>
            في الفترة: <span class="highlight">${academicYear}</span>، وكان تقديره فيه (<span class="highlight">${gradeWordAr}</span>).
            
            <div class="registration-line">
              سُجلت هذه الشهادة تحت رقم (<span class="highlight">${certificateNumber}</span>) بتاريخ: <span class="highlight">${issueDateHijri}</span> الموافق <span class="highlight">${issueDateGreg}</span>
            </div>
          </div>
          
          <div class="signatures">
            <div class="signature-block">
              <div class="signature-label">توقيع رئيس الأمانة</div>
              <div class="signature-line"></div>
            </div>
            <div class="signature-block">
              <div class="stamp-label">الختم الرسمي</div>
            </div>
            <div class="signature-block">
              <div class="signature-label">توقيع مدير المدرسة</div>
              <div class="signature-line"></div>
            </div>
          </div>
          
          <div class="validation-footer">
            <div>تصديق وزارة التربية والتعليم</div>
            <div>تصديق جهة الإشراف على المدرسة</div>
          </div>
          
          <div class="qr-code">
            <img src="${qrDataUrl}" alt="QR Code">
            <div class="qr-label">Verify Certificate</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function generateFemaleCertificateHTML(data: PrimaryCertificateData, qrDataUrl: string): string {
  const { student, school, examYear, finalGrade, certificateNumber, isReprint } = data;
  
  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');

  const dobFormatted = student.dateOfBirth 
    ? formatArabicDate(new Date(student.dateOfBirth))
    : '';
  
  const issueDate = new Date();
  const issueDateGreg = formatArabicDate(issueDate);
  const issueDateHijri = formatHijriDate(issueDate);

  const academicYear = `${examYear.year}/${examYear.year + 1}`;
  const gradeWordAr = getGradeWord(finalGrade);
  const schoolWithAddress = school.address ? `${school.name} - ${school.address}` : school.name;

  return `
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
          background: white;
        }
        
        .certificate {
          width: 842px;
          height: 595px;
          position: relative;
          background: white;
          padding: 15px;
          overflow: hidden;
        }
        
        .border-frame {
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          bottom: 8px;
          border: 3px double #1a5276;
          padding: 10px 15px;
        }
        
        .bismillah {
          text-align: center;
          font-size: 20px;
          font-weight: bold;
          color: #000;
          margin-bottom: 8px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
        }
        
        .header-left {
          width: 38%;
          text-align: left;
          direction: ltr;
          font-size: 10px;
          line-height: 1.4;
          font-family: Arial, sans-serif;
        }
        
        .header-right {
          width: 38%;
          text-align: right;
          font-size: 12px;
          line-height: 1.5;
        }
        
        .header-center {
          width: 24%;
          text-align: center;
        }
        
        .title-english {
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          color: #000;
          margin-bottom: 5px;
          font-family: Arial, sans-serif;
          letter-spacing: 1px;
        }
        
        .title-arabic {
          text-align: center;
          font-size: 22px;
          font-weight: bold;
          color: #000;
          margin-bottom: 15px;
        }
        
        .content {
          text-align: right;
          font-size: 15px;
          line-height: 2.2;
          padding: 0 20px;
        }
        
        .highlight {
          color: #000;
        }
        
        .registration-line {
          margin-top: 12px;
          font-size: 14px;
        }
        
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 35px;
          padding: 0 30px;
          font-size: 11px;
        }
        
        .signature-block {
          text-align: center;
          width: 30%;
        }
        
        .signature-line {
          border-top: 1px dotted #333;
          width: 120px;
          margin: 30px auto 5px;
        }
        
        .signature-label {
          margin-bottom: 5px;
          font-weight: bold;
        }
        
        .stamp-label {
          font-weight: bold;
          margin-top: 40px;
        }
        
        .qr-code {
          position: absolute;
          bottom: 40px;
          left: 30px;
        }
        
        .qr-code img {
          width: 65px;
          height: 65px;
        }
        
        .qr-label {
          font-size: 8px;
          color: #666;
          text-align: center;
          margin-top: 2px;
          direction: ltr;
        }
        
        .reprint-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          font-size: 70px;
          color: rgba(192, 57, 43, 0.12);
          font-weight: bold;
          z-index: 1;
          pointer-events: none;
        }
        
        .validation-footer {
          display: flex;
          justify-content: space-between;
          padding: 0 30px;
          font-size: 10px;
          margin-top: 8px;
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
              EDUCATON<br>
              The General Secretariat for Islamic/<br>
              Arabic Education<br>
              In The Gambia
            </div>
            <div class="header-center"></div>
            <div class="header-right">
              جمهوريـــــــــــــــــــــة غامبيــــــــــا<br>
              وزارة التربيـة و التعليم الأساسي<br>
              الأمانة العامة للتعليم الإسلامي العربي<br>
              في غامبيا
            </div>
          </div>
          
          <div class="title-english">GAMBIA MADRASSAH PRIMARY CERTIFICATE</div>
          <div class="title-arabic">شهادة إتمام دراسة المرحلة الابتدائية</div>
          
          <div class="content">
            تشهد الأمانة العامة بأن الطالبة/ <span class="highlight">${fullName}</span> المولودة في <span class="highlight">${student.placeOfBirth || ''}</span> بتاريخ: <span class="highlight">${dobFormatted}</span> قد أتمت دراسة المرحلة الابتدائية في <span class="highlight">${schoolWithAddress}</span> بعد أن نجحت في الامتحان النهائي الذي أشرفت عليه الأمانة العامة بالتنسيق مع وزارة التربية والتعليم في غامبيا.
            <br>
            في الفترة: <span class="highlight">${academicYear}</span>، وكان تقديرها فيه (<span class="highlight">${gradeWordAr}</span>).
            
            <div class="registration-line">
              سُجلت هذه الشهادة تحت رقم (<span class="highlight">${certificateNumber}</span>) بتاريخ: <span class="highlight">${issueDateHijri}</span> الموافق <span class="highlight">${issueDateGreg}</span>
            </div>
          </div>
          
          <div class="signatures">
            <div class="signature-block">
              <div class="signature-label">توقيع رئيس الأمانة</div>
              <div class="signature-line"></div>
            </div>
            <div class="signature-block">
              <div class="stamp-label">الختم الرسمي</div>
            </div>
            <div class="signature-block">
              <div class="signature-label">توقيع مدير المدرسة</div>
              <div class="signature-line"></div>
            </div>
          </div>
          
          <div class="validation-footer">
            <div>تصديق وزارة التربية والتعليم</div>
            <div>تصديق جهة الإشراف على المدرسة</div>
          </div>
          
          <div class="qr-code">
            <img src="${qrDataUrl}" alt="QR Code">
            <div class="qr-label">Verify Certificate</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function generatePrimaryCertificatePDF(data: PrimaryCertificateData): Promise<string> {
  const { student, verifyUrl } = data;

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 130,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  });

  const htmlContent = student.gender === 'female' 
    ? generateFemaleCertificateHTML(data, qrDataUrl)
    : generateMaleCertificateHTML(data, qrDataUrl);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const fileName = `primary_cert_${student.indexNumber || student.id}_${Date.now()}.pdf`;
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

export interface CertificateValidationResult {
  isValid: boolean;
  errors: string[];
  errorsAr: string[];
}

export function validateCertificateRequirements(student: StudentData): CertificateValidationResult {
  const errors: string[] = [];
  const errorsAr: string[] = [];

  if (!student.gender || (student.gender !== 'male' && student.gender !== 'female')) {
    errors.push('Gender is required');
    errorsAr.push('يجب تحديد جنس الطالب/الطالبة');
  }

  if (!student.dateOfBirth) {
    errors.push('Date of birth is required');
    errorsAr.push('يجب إدخال تاريخ الميلاد');
  }

  if (!student.placeOfBirth) {
    errors.push('Place of birth is required');
    errorsAr.push('يجب إدخال مكان الميلاد');
  }

  if (!student.firstName || !student.lastName) {
    errors.push('Student name is required');
    errorsAr.push('يجب إدخال اسم الطالب/الطالبة');
  }

  return {
    isValid: errors.length === 0,
    errors,
    errorsAr
  };
}
