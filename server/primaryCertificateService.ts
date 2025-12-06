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

  // PNG template dimensions: 3508x2480
  // Inner white area starts at approximately X=270px, Y=272px from edges
  // Adding 60px buffer = 330px from each edge to stay FULLY inside the white area
  const safeTop = 332;
  const safeBottom = 332;
  const safeLeft = 330;
  const safeRight = 330;

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
    
    /* SAFE AREA - positioned INSIDE the inner white area of the PNG template */
    /* PNG inner white area starts at ~270px from edges, plus 60px buffer = 330px */
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
    
    /* Watermark centered in the white area */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 500px;
      opacity: 0.10;
      pointer-events: none;
      z-index: 0;
    }
    
    /* Bismillah - centered, bold, inside safe area */
    .bismillah {
      width: 100%;
      text-align: center;
      font-size: 52px;
      font-weight: bold;
      color: #000;
      direction: rtl;
      margin-bottom: 15px;
      flex-shrink: 0;
    }
    
    /* Header row with ministry blocks and logo */
    .header-row {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
      flex-shrink: 0;
    }
    
    /* English ministry block */
    .header-english {
      width: 520px;
      font-size: 20px;
      line-height: 1.2;
      text-align: left;
      color: #000;
      font-family: 'Times New Roman', serif;
      text-transform: uppercase;
    }
    
    .header-english .italic-text {
      font-style: italic;
      text-transform: none;
    }
    
    /* Logo in center */
    .header-logo {
      width: 280px;
      text-align: center;
    }
    
    .header-logo img {
      max-width: 100%;
      max-height: 160px;
      object-fit: contain;
    }
    
    .header-logo .logo-text {
      font-size: 12px;
      margin-top: 4px;
      font-weight: bold;
      letter-spacing: 1px;
    }
    
    /* Arabic ministry block */
    .header-arabic {
      width: 520px;
      font-size: 24px;
      line-height: 1.3;
      text-align: right;
      color: #000;
      direction: rtl;
    }
    
    /* Titles section */
    .titles-section {
      width: 100%;
      text-align: center;
      margin: 10px 0 15px 0;
      flex-shrink: 0;
    }
    
    .title-english {
      font-size: 34px;
      font-weight: bold;
      letter-spacing: 2px;
      color: #000;
      font-family: 'Times New Roman', serif;
      margin-bottom: 5px;
    }
    
    .title-arabic {
      font-size: 40px;
      font-weight: bold;
      color: #000;
      direction: rtl;
    }
    
    /* Main paragraph - centered block */
    .body-content {
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      direction: rtl;
      text-align: center;
      font-size: 38px;
      line-height: 1.7;
      color: #000;
    }
    
    .body-content p {
      margin-bottom: 5px;
      text-align: center;
      max-width: 100%;
    }
    
    .highlight {
      color: #C00000;
      font-weight: bold;
      font-style: italic;
    }
    
    /* Registration line */
    .registration-line {
      width: 100%;
      text-align: center;
      direction: rtl;
      font-size: 34px;
      line-height: 1.5;
      color: #000;
      margin: 10px 0;
      flex-shrink: 0;
    }
    
    /* Signature section */
    .signature-section {
      width: 100%;
      display: flex;
      justify-content: space-between;
      direction: rtl;
      margin-top: 10px;
      flex-shrink: 0;
    }
    
    .signature-block {
      width: 420px;
      text-align: center;
    }
    
    .signature-title {
      font-size: 24px;
      color: #000;
      margin-bottom: 40px;
    }
    
    .signature-line {
      font-size: 20px;
      letter-spacing: 3px;
      margin-bottom: 10px;
    }
    
    .stamp-label {
      font-size: 20px;
      color: #333;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="certificate-container">
    ${logoBase64 ? `<img class="watermark" src="data:image/png;base64,${logoBase64}" alt="" />` : ''}
    
    <div class="safe-area">
      <!-- Bismillah -->
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
      
      <!-- Titles -->
      <div class="titles-section">
        <div class="title-english">GAMBIA MADRASSAH PRIMARY CERTIFICATE</div>
        <div class="title-arabic">شهادة إتمام دراسة المرحلة الابتدائية</div>
      </div>
      
      <!-- Main paragraph -->
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
      
      <!-- Registration info -->
      <div class="registration-line">
        سُجّلت هذه الشّهادة تحت رقم ( <span class="highlight">{${certificateNumber}}</span> ) بتاريخ : <span class="highlight">{${issueDateHijri}}</span> هـ الموافق
        <span class="highlight">{${issueDateGreg}}</span> م
      </div>
      
      <!-- Signatures -->
      <div class="signature-section">
        <div class="signature-block">
          <div class="signature-title">توقيع مدير المدرسة</div>
          <div class="signature-line">........................</div>
          <div class="stamp-label">تصديق جهة الإشراف على المدرسة</div>
        </div>
        
        <div class="signature-block">
          <div class="signature-title">الختم الرسمي</div>
          <div style="height: 40px;"></div>
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
