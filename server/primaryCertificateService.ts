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

function generateCertificateHTML(data: PrimaryCertificateData, templateBase64: string, logoBase64: string): string {
  const { student, school, examYear, finalGrade, certificateNumber } = data;
  
  const isFemale = student.gender === 'female';
  
  const fullName = student.arabicName || [student.firstName, student.middleName, student.lastName]
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

  // FINAL MEASUREMENTS - Safe area INSIDE white frame with 60px buffer
  // Template inner white area starts at ~300px, plus buffer = 360px margins
  const safeTop = 360;
  const safeBottom = 360;
  const safeLeft = 358;
  const safeRight = 358;

  return `<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: 3508px 2480px;
      margin: 0;
    }
    
    html, body {
      width: 3508px;
      height: 2480px;
      margin: 0;
      padding: 0;
      overflow: hidden;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .certificate-container {
      width: 3508px;
      height: 2480px;
      position: relative;
      background-image: url('data:image/png;base64,${templateBase64}');
      background-size: 100% 100%;
      background-position: center;
      background-repeat: no-repeat;
      font-family: 'Amiri', 'Traditional Arabic', 'Times New Roman', serif;
    }
    
    /* SAFE AREA - INSIDE the white frame with proper margins */
    .safe-area {
      position: absolute;
      top: ${safeTop}px;
      bottom: ${safeBottom}px;
      left: ${safeLeft}px;
      right: ${safeRight}px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    /* Bismillah - LARGER 66px, centered, bold */
    .bismillah {
      width: 100%;
      text-align: center;
      font-size: 66px;
      font-weight: bold;
      color: #000;
      direction: rtl;
      margin-bottom: 24px;
      flex-shrink: 0;
    }
    
    /* Header row with ministry blocks and logo */
    .header-row {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      flex-shrink: 0;
    }
    
    /* English ministry block - LARGER 28px */
    .header-english {
      width: 600px;
      font-size: 28px;
      line-height: 1.25;
      text-align: left;
      color: #000;
      font-family: 'Times New Roman', serif;
      text-transform: uppercase;
    }
    
    .header-english .italic-text {
      font-style: italic;
      text-transform: none;
    }
    
    /* Logo in center - 260px tall */
    .header-logo {
      width: 320px;
      text-align: center;
    }
    
    .header-logo img {
      max-width: 100%;
      max-height: 260px;
      object-fit: contain;
    }
    
    .header-logo .logo-text {
      font-size: 18px;
      margin-top: 8px;
      font-weight: bold;
      letter-spacing: 2px;
    }
    
    /* Arabic ministry block - LARGER 34px */
    .header-arabic {
      width: 600px;
      font-size: 34px;
      line-height: 1.35;
      text-align: right;
      color: #000;
      direction: rtl;
    }
    
    /* Titles section - LARGER */
    .titles-section {
      width: 100%;
      text-align: center;
      margin: 15px 0 20px 0;
      flex-shrink: 0;
    }
    
    /* English title - 46px */
    .title-english {
      font-size: 46px;
      font-weight: bold;
      letter-spacing: 3px;
      color: #000;
      font-family: 'Times New Roman', serif;
      margin-bottom: 8px;
    }
    
    /* Arabic title - 54px */
    .title-arabic {
      font-size: 54px;
      font-weight: bold;
      color: #000;
      direction: rtl;
    }
    
    /* Main paragraph - LARGER 50px, fills space */
    .body-content {
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      direction: rtl;
      text-align: center;
      font-size: 50px;
      line-height: 1.6;
      color: #000;
    }
    
    .body-content p {
      margin-bottom: 12px;
      text-align: center;
      max-width: 100%;
    }
    
    .highlight {
      color: #C00000;
      font-weight: bold;
      font-style: italic;
    }
    
    /* Registration line - LARGER 44px */
    .registration-line {
      width: 100%;
      text-align: center;
      direction: rtl;
      font-size: 44px;
      line-height: 1.5;
      color: #000;
      margin: 15px 0;
      flex-shrink: 0;
    }
    
    /* Signature section - LARGER fonts */
    .signature-section {
      width: 100%;
      display: flex;
      justify-content: space-between;
      direction: rtl;
      margin-top: 20px;
      flex-shrink: 0;
    }
    
    .signature-block {
      width: 500px;
      text-align: center;
    }
    
    /* Signature title - 32px */
    .signature-title {
      font-size: 32px;
      color: #000;
      margin-bottom: 50px;
    }
    
    /* Dotted lines - 28px */
    .signature-line {
      font-size: 28px;
      letter-spacing: 4px;
      margin-bottom: 15px;
    }
    
    /* Stamp labels - 26px */
    .stamp-label {
      font-size: 26px;
      color: #333;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    <!-- NO WATERMARK - REMOVED -->
    
    <div class="safe-area">
      <!-- Bismillah - 66px, centered, bold -->
      <div class="bismillah">بسم الله الرحمن الرحيم</div>
      
      <!-- Header row -->
      <div class="header-row">
        <div class="header-english">
          THE REPUBLIC OF THE GAMBIA<br/>
          DEPARTMENT OF STATE FOR<br/>
          BASIC AND SECONDARY<br/>
          EDUCATION<br/>
          <span class="italic-text">The General Secretariat for Islamic/<br/>
          Arabic Education<br/>
          In The Gambia</span>
        </div>
        
        <div class="header-logo">
          ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo" />` : ''}
          <div class="logo-text">EDUCATION FOR DEVELOPMENT</div>
        </div>
        
        <div class="header-arabic">
          جمهوريـــــــــة غامبيـــــــا<br/>
          وزارة التربية و التعليم الأساسي<br/>
          الأمانة العامة للتعليم الاسلامي العربي<br/>
          في غامبيا
        </div>
      </div>
      
      <!-- Titles - LARGER -->
      <div class="titles-section">
        <div class="title-english">GAMBIA MADRASSAH PRIMARY CERTIFICATE</div>
        <div class="title-arabic">شهادة إتمام دراسة المرحلة الابتدائية</div>
      </div>
      
      <!-- Main paragraph - 50px, fills space -->
      <div class="body-content">
        <p>
          تشهد الأمانة العامّة بأنّ ${studentLabel}/ <span class="highlight">{${fullName}}</span> ${bornLabel} في <span class="highlight">{${student.placeOfBirth || ''}}</span> بتاريخ :
          <span class="highlight">{${dobFormatted}}</span> م قد ${completedLabel} دراسة المرحلة الابتدائية في <span class="highlight">{${schoolWithAddress}}</span> بعد أن ${passedLabel}
          في الامتحان النهائي الذي أشرفت عليه الأمانة العامّة بالتنسيق مع وزارة التربية والتعليم في غامبيا.
        </p>
        <p>
          في الفترة: <span class="highlight">{${academicYear}}</span> , وكان ${gradeLabel} فيه ( <span class="highlight">{${gradeWordAr}}</span> ).
        </p>
      </div>
      
      <!-- Registration info - 44px -->
      <div class="registration-line">
        سُجّلت هذه الشّهادة تحت رقم ( <span class="highlight">{${certificateNumber}}</span> ) بتاريخ : <span class="highlight">{${issueDateHijri}}</span> هـ الموافق
        <span class="highlight">{${issueDateGreg}}</span> م
      </div>
      
      <!-- Signatures - LARGER fonts -->
      <div class="signature-section">
        <div class="signature-block">
          <div class="signature-title">توقيع مدير المدرسة</div>
          <div class="signature-line">........................</div>
          <div class="stamp-label">تصديق جهة الإشراف على المدرسة</div>
        </div>
        
        <div class="signature-block">
          <div class="signature-title">الختم الرسمي</div>
          <div style="height: 50px;"></div>
        </div>
        
        <div class="signature-block">
          <div class="signature-title">توقيع رئيس الأمانة</div>
          <div class="signature-line">........................</div>
          <div class="stamp-label">تصديق وزارة التربية والتعليم</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function generatePrimaryCertificatePDF(data: PrimaryCertificateData): Promise<string> {
  const { student, certificateNumber } = data;
  
  let logoBase64 = '';
  const logoPath = path.join(process.cwd(), 'attached_assets', 'Amana_Logo_1765049398386.png');
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = logoBuffer.toString('base64');
  }
  
  let templateBase64 = '';
  // USE THE CORRECT FINAL TEMPLATE
  // USE BLANK BORDER TEMPLATE (no sample text - only decorative border)
  const templatePath = path.join(process.cwd(), 'attached_assets', 'approved_designs_1765063884505.png');
  if (fs.existsSync(templatePath)) {
    const templateBuffer = fs.readFileSync(templatePath);
    templateBase64 = templateBuffer.toString('base64');
  }
  
  const html = generateCertificateHTML(data, templateBase64, logoBase64);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });
  
  try {
    const page = await browser.newPage();
    
    await page.setViewport({
      width: 3508,
      height: 2480,
      deviceScaleFactor: 1
    });
    
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000
    });
    
    await page.evaluateHandle('document.fonts.ready');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const filename = `primary_cert_${student.id}_${certificateNumber.replace(/\//g, '-')}_${Date.now()}.pdf`;
    const pdfPath = path.join(outputDir, filename);
    
    await page.pdf({
      path: pdfPath,
      width: '3508px',
      height: '2480px',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      scale: 1
    });
    
    return pdfPath;
  } finally {
    await browser.close();
  }
}

export function validateCertificateRequirements(student: StudentData): { 
  isValid: boolean; 
  errors: string[]; 
  errorsAr: string[];
} {
  const errors: string[] = [];
  const errorsAr: string[] = [];

  if (!student.firstName || !student.lastName) {
    errors.push('Student name is required');
    errorsAr.push('اسم الطالب مطلوب');
  }
  if (!student.gender || !['male', 'female'].includes(student.gender)) {
    errors.push('Valid gender is required');
    errorsAr.push('الجنس صحيح مطلوب');
  }
  if (!student.grade) {
    errors.push('Grade is required');
    errorsAr.push('الصف مطلوب');
  }
  if (!student.dateOfBirth) {
    errors.push('Date of birth is required');
    errorsAr.push('تاريخ الميلاد مطلوب');
  }
  if (!student.placeOfBirth) {
    errors.push('Place of birth is required');
    errorsAr.push('مكان الميلاد مطلوب');
  }
  if (!student.indexNumber) {
    errors.push('Index number is required');
    errorsAr.push('رقم الفهرس مطلوب');
  }

  return {
    isValid: errors.length === 0,
    errors,
    errorsAr
  };
}

export { generateCertificateHTML };
