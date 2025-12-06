import puppeteer from 'puppeteer';
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
  arabicName?: string | null;
  gender: 'male' | 'female';
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  grade: number;
  indexNumber: string | null;
}

interface SchoolData {
  id: number;
  name: string;
  arabicName?: string | null;
  address?: string | null;
  arabicAddress?: string | null;
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

function generateCertificateHTML(data: PrimaryCertificateData, logoBase64: string): string {
  const { student, school, examYear, finalGrade, certificateNumber } = data;
  
  const isFemale = student.gender === 'female';
  
  const fullNameAr = student.arabicName || [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');

  const dobFormatted = student.dateOfBirth 
    ? formatArabicDate(new Date(student.dateOfBirth))
    : '';
  
  const issueDate = new Date();
  const issueDateGreg = formatArabicDate(issueDate);
  const issueDateHijri = formatHijriDate(issueDate);

  const academicYear = `${examYear.year - 1}/${examYear.year}`;
  const gradeWordAr = getGradeWord(finalGrade);
  
  const schoolNameAr = school.arabicName || school.name;
  const schoolAddressAr = school.arabicAddress || school.address || '';
  const schoolWithAddress = schoolAddressAr ? `${schoolNameAr} - ${schoolAddressAr}` : schoolNameAr;

  const studentLabel = isFemale ? 'الطالبة' : 'الطالب';
  const bornLabel = isFemale ? 'المولودة' : 'المولود';
  const completedLabel = isFemale ? 'أتمّت' : 'أتمّ';
  const passedLabel = isFemale ? 'نجحت' : 'نجح';
  const gradeLabel = isFemale ? 'تقديرها' : 'تقديره';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4 landscape;
      margin: 0;
    }
    
    body {
      font-family: 'Amiri', 'Noto Naskh Arabic', 'Times New Roman', serif;
      width: 297mm;
      height: 210mm;
      margin: 0;
      background: white;
      position: relative;
      overflow: hidden;
    }
    
    .certificate-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
      padding: 6mm;
    }
    
    /* Outer decorative border - diamond pattern in yellow/gold and blue */
    .outer-border {
      position: absolute;
      top: 4mm;
      left: 4mm;
      right: 4mm;
      bottom: 4mm;
      border: 4px solid #1a4d7c;
      background: linear-gradient(45deg, #c9a227 25%, transparent 25%),
                  linear-gradient(-45deg, #c9a227 25%, transparent 25%),
                  linear-gradient(45deg, transparent 75%, #c9a227 75%),
                  linear-gradient(-45deg, transparent 75%, #c9a227 75%);
      background-size: 8px 8px;
      background-position: 0 0, 4px 0, 4px -4px, 0px 4px;
    }
    
    /* Inner double blue frame */
    .inner-frame {
      position: absolute;
      top: 10mm;
      left: 10mm;
      right: 10mm;
      bottom: 10mm;
      border: 3px double #1a4d7c;
    }
    
    /* Content area inside the frame */
    .certificate-content {
      position: absolute;
      top: 14mm;
      left: 14mm;
      right: 14mm;
      bottom: 14mm;
      display: flex;
      flex-direction: column;
    }
    
    /* Bismillah - top center */
    .bismillah {
      text-align: center;
      font-size: 20pt;
      font-weight: bold;
      color: #1a4d7c;
      margin-bottom: 6mm;
      font-family: 'Amiri', serif;
    }
    
    /* Header row: English (left) - Logo (center) - Arabic (right) */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 5mm;
      direction: ltr;
    }
    
    .header-english {
      flex: 1;
      text-align: left;
      font-size: 9pt;
      line-height: 1.4;
      font-family: 'Times New Roman', serif;
      color: #000;
    }
    
    .header-logo {
      flex: 0 0 auto;
      text-align: center;
      padding: 0 15mm;
    }
    
    .header-logo img {
      width: 55mm;
      height: auto;
      max-height: 35mm;
      object-fit: contain;
    }
    
    .header-arabic {
      flex: 1;
      text-align: right;
      font-size: 11pt;
      line-height: 1.5;
      font-family: 'Amiri', serif;
      direction: rtl;
      color: #000;
    }
    
    /* Certificate titles */
    .title-section {
      text-align: center;
      margin: 4mm 0;
    }
    
    .title-english {
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 1px;
      color: #1a4d7c;
      font-family: 'Times New Roman', serif;
      margin-bottom: 2mm;
    }
    
    .title-arabic {
      font-size: 18pt;
      font-weight: bold;
      color: #1a4d7c;
      font-family: 'Amiri', serif;
    }
    
    /* Certificate body - Arabic text */
    .certificate-body {
      font-size: 13pt;
      line-height: 2;
      text-align: justify;
      direction: rtl;
      padding: 4mm 10mm;
      font-family: 'Amiri', serif;
      flex: 1;
    }
    
    .certificate-body b {
      font-weight: bold;
    }
    
    /* Registration line */
    .registration-line {
      text-align: center;
      font-size: 12pt;
      margin: 4mm 0;
      font-family: 'Amiri', serif;
      direction: rtl;
    }
    
    /* Signature section */
    .signature-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 0 15mm;
      margin-top: 6mm;
      direction: rtl;
    }
    
    .signature-block {
      text-align: center;
      width: 30%;
    }
    
    .signature-label {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 8mm;
      font-family: 'Amiri', serif;
    }
    
    .signature-line {
      border-bottom: 1px dotted #333;
      width: 100%;
      height: 1px;
      margin-top: 12mm;
    }
    
    .dotted-text {
      font-size: 10pt;
      letter-spacing: 2px;
      color: #666;
    }
    
    /* Verification section - bottom */
    .verification-section {
      display: flex;
      justify-content: space-between;
      padding: 0 30mm;
      margin-top: 8mm;
      direction: rtl;
    }
    
    .verification-block {
      text-align: center;
    }
    
    .verification-label {
      font-size: 10pt;
      color: #333;
      font-family: 'Amiri', serif;
    }
    
    .verification-line {
      border-bottom: 1px dotted #333;
      width: 60mm;
      margin-top: 10mm;
    }
  </style>
</head>
<body>
  <div class="certificate-wrapper">
    <!-- Outer decorative border -->
    <div class="outer-border"></div>
    
    <!-- Inner double blue frame -->
    <div class="inner-frame"></div>
    
    <!-- Content area -->
    <div class="certificate-content">
      <!-- Bismillah -->
      <div class="bismillah">بسم الله الرحمن الرحيم</div>
      
      <!-- Header Row: English (Left) - Logo (Center) - Arabic (Right) -->
      <div class="header-row">
        <div class="header-english">
          THE REPUBLIC OF THE GAMBIA<br>
          DEPARTMENT OF STATE FOR<br>
          BASIC AND SECONDARY EDUCATION<br>
          The General Secretariat for Islamic/<br>
          Arabic Education<br>
          In The Gambia
        </div>
        
        <div class="header-logo">
          <img src="${logoBase64}" alt="Official Logo">
        </div>
        
        <div class="header-arabic">
          جمهوريـــــــــة غامبيـــــــــا<br>
          وزارة التربيـة والتعليم الأساسي<br>
          الأمانة العامة للتعليم الإسلامي العربي<br>
          في غامبيا
        </div>
      </div>
      
      <!-- Certificate Titles -->
      <div class="title-section">
        <div class="title-english">GAMBIA MADRASSAH PRIMARY CERTIFICATE</div>
        <div class="title-arabic">شهادة إتمام دراسة المرحلة الابتدائية</div>
      </div>
      
      <!-- Certificate Body -->
      <div class="certificate-body">
        تشهد الأمانة العامة بأن ${studentLabel}/ <b>${fullNameAr}</b> ${bornLabel} في <b>${student.placeOfBirth || 'غامبيا'}</b> بتاريخ: <b>${dobFormatted}</b> م قد ${completedLabel} دراسة المرحلة الابتدائية في <b>${schoolWithAddress}</b> بعد أن ${passedLabel} في الامتحان النهائي الذي أشرفت عليه الأمانة العامة بالتنسيق مع وزارة التربية والتعليم في غامبيا.
        <br><br>
        في الفترة: <b>${academicYear}</b> م، وكان ${gradeLabel} فيه ( <b>${gradeWordAr}</b> ).
      </div>
      
      <!-- Registration Line -->
      <div class="registration-line">
        سُجّلت هذه الشهادة تحت رقم ( <b>${certificateNumber}</b> ) بتاريخ: <b>${issueDateHijri}</b> هـ الموافق <b>${issueDateGreg}</b> م
      </div>
      
      <!-- Signature Section -->
      <div class="signature-section">
        <div class="signature-block">
          <div class="signature-label">توقيع مدير المدرسة</div>
          <div class="dotted-text">.............................</div>
        </div>
        
        <div class="signature-block">
          <div class="signature-label">الختم الرسمي</div>
          <div class="dotted-text">.............................</div>
        </div>
        
        <div class="signature-block">
          <div class="signature-label">توقيع رئيس الأمانة</div>
          <div class="dotted-text">.............................</div>
        </div>
      </div>
      
      <!-- Verification Section -->
      <div class="verification-section">
        <div class="verification-block">
          <div class="verification-label">تصديق جهة الإشراف على المدرسة</div>
          <div class="verification-line"></div>
        </div>
        
        <div class="verification-block">
          <div class="verification-label">تصديق وزارة التربية والتعليم</div>
          <div class="verification-line"></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function generatePrimaryCertificatePDF(data: PrimaryCertificateData): Promise<string> {
  const { student } = data;

  const logoPath = path.join(outputDir, 'logo.png');
  let logoBase64 = '';
  
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } else {
    logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  const htmlContent = generateCertificateHTML(data, logoBase64);

  const browser = await puppeteer.launch({
    headless: 'new' as any,
    executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-web-resources']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const fileName = `primary_cert_${student.indexNumber || student.id}_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);
    
    await page.pdf({
      path: filePath,
      width: '297mm',
      height: '210mm',
      landscape: true,
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      scale: 1,
      displayHeaderFooter: false
    });
    
    return filePath;
  } catch (error) {
    console.error(`PDF generation error for student ${student.id}:`, error);
    throw error;
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

  if (!student.firstName || !student.lastName) {
    errors.push('Student name is incomplete');
    errorsAr.push('اسم الطالب غير مكتمل');
  }

  if (!student.dateOfBirth) {
    errors.push('Date of birth is missing');
    errorsAr.push('تاريخ الميلاد مفقود');
  }

  if (!student.placeOfBirth) {
    errors.push('Place of birth is missing');
    errorsAr.push('مكان الميلاد مفقود');
  }

  if (!student.indexNumber) {
    errors.push('Index number is missing');
    errorsAr.push('رقم الفهرس مفقود');
  }

  return {
    isValid: errors.length === 0,
    errors,
    errorsAr
  };
}
