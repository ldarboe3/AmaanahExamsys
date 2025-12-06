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

function transliterateArabicToEnglish(arabic: string): string {
  const translitMap: { [key: string]: string } = {
    'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
    'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'a', 'ء': "'", 'ئ': 'e',
    'ؤ': 'o', ' ': ' ', 'ـ': ''
  };
  
  let result = '';
  for (const char of arabic) {
    result += translitMap[char] || char;
  }
  return result.replace(/\s+/g, ' ').trim();
}

function generateCertificateHTML(data: PrimaryCertificateData, qrDataUrl: string, logoBase64: string, watermarkBase64: string): string {
  const { student, school, examYear, finalGrade, certificateNumber } = data;
  
  const isFemale = student.gender === 'female';
  
  const fullNameAr = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');
  
  const fullNameEn = transliterateArabicToEnglish(fullNameAr);

  const dobFormatted = student.dateOfBirth 
    ? formatArabicDate(new Date(student.dateOfBirth))
    : '';
  
  const issueDate = new Date();
  const issueDateGreg = formatArabicDate(issueDate);
  const issueDateHijri = formatHijriDate(issueDate);

  const academicYear = `${examYear.year - 1}/${examYear.year}`;
  const gradeWordAr = getGradeWord(finalGrade);
  
  const schoolWithAddress = school.address 
    ? `${school.name} - ${school.address}` 
    : school.name;

  const studentLabel = isFemale ? 'الطالبة' : 'الطالب';
  const bornLabel = isFemale ? 'المولودة' : 'المولود';
  const completedLabel = isFemale ? 'أتمت' : 'أتم';
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
      size: A4 portrait;
      margin: 0;
    }
    
    body {
      font-family: 'Amiri', 'Noto Naskh Arabic', 'Times New Roman', serif;
      width: 210mm;
      height: 297mm;
      margin: 0 auto;
      background: white;
      position: relative;
    }
    
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.15;
      pointer-events: none;
      z-index: 0;
      width: 300px;
      height: 300px;
    }
    .watermark img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    .certificate-container {
      width: 100%;
      height: 100%;
      padding: 15mm 20mm;
      position: relative;
      border: 3px double #1a365d;
      margin: 5mm;
      box-sizing: border-box;
      width: calc(100% - 10mm);
      height: calc(100% - 10mm);
    }
    
    .inner-border {
      position: absolute;
      top: 3mm;
      left: 3mm;
      right: 3mm;
      bottom: 3mm;
      border: 1px solid #1a365d;
      pointer-events: none;
    }
    
    .bismillah {
      text-align: center;
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 10mm;
      color: #1a365d;
    }
    
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8mm;
    }
    
    .header-english {
      text-align: left;
      direction: ltr;
      font-size: 10pt;
      line-height: 1.4;
      width: 35%;
      color: #1a365d;
    }
    
    .header-logo {
      text-align: center;
      width: 30%;
    }
    
    .header-logo img {
      width: 25mm;
      height: 25mm;
      object-fit: contain;
    }
    
    .header-arabic {
      text-align: right;
      direction: rtl;
      font-size: 11pt;
      line-height: 1.4;
      width: 35%;
      color: #1a365d;
    }
    
    .certificate-title {
      text-align: center;
      margin: 8mm 0;
    }
    
    .title-english {
      font-size: 14pt;
      font-weight: bold;
      color: #1a365d;
      direction: ltr;
      margin-bottom: 3mm;
      letter-spacing: 1px;
    }
    
    .title-arabic {
      font-size: 18pt;
      font-weight: bold;
      color: #1a365d;
    }
    
    .certificate-body {
      text-align: right;
      direction: rtl;
      font-size: 14pt;
      line-height: 2.2;
      margin: 10mm 5mm;
      padding: 0 10mm;
    }
    
    .certificate-body b {
      color: #000;
    }
    
    .signature-section {
      margin-top: 15mm;
      padding: 0 10mm;
    }
    
    .signature-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8mm;
    }
    
    .signature-block {
      text-align: center;
      width: 30%;
    }
    
    .signature-block.left {
      text-align: left;
      direction: ltr;
    }
    
    .signature-block.right {
      text-align: right;
      direction: rtl;
    }
    
    .signature-block.center {
      text-align: center;
    }
    
    .signature-label {
      font-size: 11pt;
      margin-bottom: 3mm;
      color: #1a365d;
    }
    
    .signature-line {
      font-size: 10pt;
      letter-spacing: 2px;
      color: #333;
    }
    
    .stamp-label {
      font-size: 10pt;
      color: #666;
      margin-top: 2mm;
    }
    
    .footer-section {
      position: absolute;
      bottom: 15mm;
      left: 20mm;
      right: 20mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .qr-section {
      text-align: center;
    }
    
    .qr-section img {
      width: 22mm;
      height: 22mm;
    }
    
    .serial-number {
      font-size: 8pt;
      color: #666;
      margin-top: 2mm;
      direction: ltr;
      font-family: 'Courier New', monospace;
    }
    
    .verification-section {
      display: flex;
      justify-content: space-between;
      width: 70%;
    }
    
    .verification-block {
      text-align: center;
      width: 45%;
    }
    
    .verification-label {
      font-size: 10pt;
      color: #1a365d;
      margin-bottom: 8mm;
    }
    
    .verification-line {
      border-bottom: 1px dotted #333;
      width: 100%;
      margin-top: 15mm;
    }
  </style>
</head>
<body>
  ${watermarkBase64 ? `<div class="watermark"><img src="${watermarkBase64}" alt="Watermark"></div>` : ''}
  <div class="certificate-container">
    <div class="inner-border"></div>
    
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
    
    <!-- Certificate Title -->
    <div class="certificate-title">
      <div class="title-english">GAMBIA MADRASSAH PRIMARY CERTIFICATE</div>
      <div class="title-arabic">شهادة إتمام دراسة المرحلة الابتدائية</div>
    </div>
    
    <!-- Certificate Body -->
    <div class="certificate-body">
      تشهد الأمانة العامة بأن ${studentLabel}/ <b>${fullNameAr}</b> ${bornLabel} في <b>${student.placeOfBirth || 'غامبيا'}</b> بتاريخ: <b>${dobFormatted}</b> م قد ${completedLabel} دراسة المرحلة الابتدائية في <b>${schoolWithAddress}</b> بعد أن ${passedLabel} في الامتحان النهائي الذي أشرفت عليه الأمانة العامة بالتنسيق مع وزارة التربية والتعليم في غامبيا.
      <br><br>
      في الفترة: <b>${academicYear}</b> م، وكان ${gradeLabel} فيه ( <b>${gradeWordAr}</b> ).
      <br><br>
      سُجّلت هذه الشهادة تحت رقم ( <b>${certificateNumber}</b> ) بتاريخ: <b>${issueDateHijri}</b> هـ الموافق <b>${issueDateGreg}</b> م
    </div>
    
    <!-- Signature Section -->
    <div class="signature-section">
      <div class="signature-row">
        <div class="signature-block right">
          <div class="signature-label">توقيع مدير المدرسة</div>
          <div class="signature-line">.............................</div>
        </div>
        
        <div class="signature-block center">
          <div class="signature-label">الختم الرسمي</div>
          <div class="stamp-label">&nbsp;</div>
        </div>
        
        <div class="signature-block left">
          <div class="signature-label">توقيع رئيس الأمانة</div>
          <div class="signature-line">.............................</div>
        </div>
      </div>
      
      <div class="signature-row">
        <div class="signature-block right">
          <div class="signature-label">تصديق جهة الإشراف على المدرسة</div>
          <div class="verification-line"></div>
        </div>
        
        <div class="signature-block center">
          &nbsp;
        </div>
        
        <div class="signature-block left">
          <div class="signature-label">تصديق وزارة التربية والتعليم</div>
          <div class="verification-line"></div>
        </div>
      </div>
    </div>
    
    <!-- QR Code and Serial -->
    <div class="footer-section">
      <div class="qr-section">
        <img src="${qrDataUrl}" alt="QR Code">
        <div class="serial-number">${certificateNumber}</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function generatePrimaryCertificatePDF(data: PrimaryCertificateData): Promise<string> {
  const { student, verifyUrl } = data;

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 200,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  });

  const logoPath = path.join(outputDir, 'logo.png');
  let logoBase64 = '';
  
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } else {
    logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }

  // Load watermark logo
  const watermarkPath = path.join(outputDir, 'watermark_logo.png');
  let watermarkBase64 = '';
  
  if (fs.existsSync(watermarkPath)) {
    const watermarkBuffer = fs.readFileSync(watermarkPath);
    watermarkBase64 = `data:image/png;base64,${watermarkBuffer.toString('base64')}`;
  }

  const htmlContent = generateCertificateHTML(data, qrDataUrl, logoBase64, watermarkBase64);

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
      format: 'A4',
      landscape: false,
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
