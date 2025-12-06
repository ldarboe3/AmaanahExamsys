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

  // STRICT 60px inner margin from the patterned border (scaled to 300dpi = 180px)
  const safeMargin = 180;

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
    
    /* STRICT SAFE AREA - 60px margin (180px at 300dpi) from border on ALL sides */
    .safe-area {
      position: absolute;
      top: ${safeMargin}px;
      left: ${safeMargin}px;
      right: ${safeMargin}px;
      bottom: ${safeMargin}px;
      display: flex;
      flex-direction: column;
    }
    
    /* Watermark centered */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      opacity: 0.10;
      pointer-events: none;
      z-index: 0;
    }
    
    /* Bismillah - 18-20pt = 54-60px at 300dpi, centered, bold, INSIDE safe area */
    .bismillah {
      width: 100%;
      text-align: center;
      font-size: 58px;
      font-weight: bold;
      color: #000;
      direction: rtl;
      margin-bottom: 25px;
    }
    
    /* Header row - MOVED DOWN to give space for Bismillah */
    .header-row {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      padding: 0 40px;
    }
    
    /* English ministry block - shifted DOWN */
    .header-english {
      width: 560px;
      font-size: 22px;
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
    
    /* Logo - MOVED DOWN by 45-60px */
    .header-logo {
      width: 300px;
      text-align: center;
      margin-top: 15px;
    }
    
    .header-logo img {
      max-width: 100%;
      max-height: 180px;
      object-fit: contain;
    }
    
    .header-logo .logo-text {
      font-size: 14px;
      margin-top: 5px;
      font-weight: bold;
      letter-spacing: 1px;
    }
    
    /* Arabic ministry block - shifted DOWN */
    .header-arabic {
      width: 560px;
      font-size: 26px;
      line-height: 1.35;
      text-align: right;
      color: #000;
      direction: rtl;
    }
    
    /* Titles section */
    .titles-section {
      width: 100%;
      text-align: center;
      margin: 10px 0 20px 0;
    }
    
    .title-english {
      font-size: 38px;
      font-weight: bold;
      letter-spacing: 2px;
      color: #000;
      font-family: 'Times New Roman', serif;
      margin-bottom: 6px;
    }
    
    .title-arabic {
      font-size: 44px;
      font-weight: bold;
      color: #000;
      direction: rtl;
    }
    
    /* Main paragraph - 14-15pt = 42-45px at 300dpi, centered block, moved DOWN */
    .body-content {
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      direction: rtl;
      text-align: center;
      font-size: 44px;
      line-height: 1.75;
      color: #000;
      padding: 15px 60px;
    }
    
    .body-content p {
      margin-bottom: 6px;
      text-align: center;
      max-width: 2800px;
    }
    
    .highlight {
      color: #C00000;
      font-weight: bold;
      font-style: italic;
    }
    
    /* Registration line - centered, inside safe area */
    .registration-line {
      width: 100%;
      text-align: center;
      direction: rtl;
      font-size: 38px;
      line-height: 1.6;
      color: #000;
      margin: 10px 0;
      padding: 0 60px;
    }
    
    /* Signature section - inside safe area, properly spaced */
    .signature-section {
      width: 100%;
      display: flex;
      justify-content: space-between;
      direction: rtl;
      padding: 0 80px;
      margin-top: 15px;
    }
    
    .signature-block {
      width: 480px;
      text-align: center;
    }
    
    .signature-title {
      font-size: 26px;
      color: #000;
      margin-bottom: 50px;
    }
    
    .signature-line {
      font-size: 22px;
      letter-spacing: 4px;
      margin-bottom: 12px;
    }
    
    .stamp-label {
      font-size: 22px;
      color: #333;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    ${logoBase64 ? `<img class="watermark" src="data:image/png;base64,${logoBase64}" alt="" />` : ''}
    
    <div class="safe-area">
      <!-- Bismillah - centered, bold, 18-20pt, INSIDE safe area -->
      <div class="bismillah">بسم الله الرحمن الرحيم</div>
      
      <!-- Header row - ministry blocks shifted DOWN below Bismillah -->
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
      
      <!-- Titles -->
      <div class="titles-section">
        <div class="title-english">GAMBIA MADRASSAH PRIMARY CERTIFICATE</div>
        <div class="title-arabic">شهادة إتمام دراسة المرحلة الابتدائية</div>
      </div>
      
      <!-- Main paragraph - 14-15pt, centered block, moved down with equal spacing -->
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
      
      <!-- Registration info - inside safe area -->
      <div class="registration-line">
        سُجّلت هذه الشّهادة تحت رقم ( <span class="highlight">{${certificateNumber}}</span> ) بتاريخ : <span class="highlight">{${issueDateHijri}}</span> هـ الموافق
        <span class="highlight">{${issueDateGreg}}</span> م
      </div>
      
      <!-- Signatures - inside safe area, aligned like PNG template -->
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
