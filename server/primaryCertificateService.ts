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
  
  // Get the student's full name
  const fullName = student.arabicName || [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');

  // Format dates
  const dobFormatted = student.dateOfBirth 
    ? formatArabicDate(new Date(student.dateOfBirth))
    : '';
  
  const issueDate = new Date();
  const issueDateGreg = formatArabicDate(issueDate);
  const issueDateHijri = formatHijriDate(issueDate);

  // Academic year format
  const academicYear = `${examYear.year - 1}/${examYear.year}`;
  
  // Get grade word in Arabic
  const gradeWordAr = getGradeWord(finalGrade);
  
  // School info
  const schoolNameAr = school.arabicName || school.name;
  const schoolAddressAr = school.arabicAddress || school.address || '';
  const schoolWithAddress = schoolAddressAr ? `${schoolNameAr} - ${schoolAddressAr}` : schoolNameAr;

  // Gender-specific labels
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
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .certificate-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
    }
    
    /* Decorative border - yellow diamonds with blue accents */
    .outer-border {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        repeating-linear-gradient(
          0deg,
          #c9a227 0px, #c9a227 8px,
          transparent 8px, transparent 16px
        ),
        repeating-linear-gradient(
          90deg,
          #c9a227 0px, #c9a227 8px,
          transparent 8px, transparent 16px
        );
      border: 8mm solid transparent;
      border-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect fill="%23c9a227" x="0" y="0" width="40" height="40"/><polygon fill="%231a4d7c" points="20,5 35,20 20,35 5,20"/><polygon fill="%23fff" points="20,10 30,20 20,30 10,20"/><polygon fill="%231a4d7c" points="20,13 27,20 20,27 13,20"/></svg>') 40 round;
    }
    
    /* Diamond border pattern */
    .diamond-border {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border: 10mm solid;
      border-image: repeating-linear-gradient(
        45deg,
        #c9a227 0,
        #c9a227 10px,
        #1a4d7c 10px,
        #1a4d7c 12px,
        #fff 12px,
        #fff 18px,
        #1a4d7c 18px,
        #1a4d7c 20px
      ) 20;
    }
    
    /* Main certificate area */
    .certificate-content {
      position: absolute;
      top: 10mm;
      left: 10mm;
      right: 10mm;
      bottom: 10mm;
      background: white;
      border: 2px solid #1a4d7c;
      display: flex;
      flex-direction: column;
      padding: 8mm;
    }
    
    /* Bismillah at top */
    .bismillah {
      text-align: center;
      font-size: 18pt;
      font-weight: bold;
      color: #000;
      margin-bottom: 4mm;
      font-family: 'Amiri', serif;
    }
    
    /* Header with logos and text */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4mm;
      direction: ltr;
    }
    
    .header-english {
      flex: 1;
      text-align: left;
      font-size: 8pt;
      line-height: 1.3;
      font-family: 'Times New Roman', serif;
      color: #000;
      padding-right: 5mm;
    }
    
    .header-logo {
      flex: 0 0 auto;
      text-align: center;
      padding: 0 8mm;
    }
    
    .header-logo img {
      width: 40mm;
      height: auto;
      max-height: 28mm;
      object-fit: contain;
    }
    
    .header-arabic {
      flex: 1;
      text-align: right;
      font-size: 10pt;
      line-height: 1.4;
      font-family: 'Amiri', serif;
      direction: rtl;
      color: #000;
      padding-left: 5mm;
    }
    
    /* Certificate title section */
    .title-section {
      text-align: center;
      margin: 3mm 0 5mm 0;
    }
    
    .title-english {
      font-size: 14pt;
      font-weight: bold;
      letter-spacing: 2px;
      color: #1a4d7c;
      font-family: 'Times New Roman', serif;
      margin-bottom: 2mm;
    }
    
    .title-arabic {
      font-size: 16pt;
      font-weight: bold;
      color: #1a4d7c;
      font-family: 'Amiri', serif;
    }
    
    /* Certificate body text */
    .body-text {
      direction: rtl;
      text-align: right;
      font-size: 11pt;
      line-height: 2.0;
      color: #000;
      font-family: 'Amiri', serif;
      padding: 0 15mm;
      flex: 1;
    }
    
    .body-text p {
      margin-bottom: 0;
      text-indent: 10mm;
    }
    
    .highlight {
      color: #1a237e;
      font-weight: bold;
      font-style: italic;
    }
    
    /* Registration info */
    .registration-info {
      direction: rtl;
      text-align: right;
      font-size: 10pt;
      line-height: 1.8;
      padding: 0 15mm;
      margin-top: 3mm;
    }
    
    /* Signature section */
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 8mm;
      padding: 0 20mm;
      direction: rtl;
    }
    
    .signature-block {
      text-align: center;
      width: 30%;
    }
    
    .signature-title {
      font-size: 9pt;
      color: #000;
      margin-bottom: 12mm;
    }
    
    .signature-line {
      border-top: 1px dotted #000;
      margin-top: 10mm;
    }
    
    .stamp-label {
      font-size: 8pt;
      color: #666;
      margin-top: 2mm;
    }
  </style>
</head>
<body>
  <div class="certificate-wrapper">
    <!-- Decorative diamond border pattern -->
    <svg style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;" viewBox="0 0 297 210" preserveAspectRatio="none">
      <!-- Yellow background for border area -->
      <rect x="0" y="0" width="297" height="210" fill="#c9a227"/>
      
      <!-- Diamond pattern - top row -->
      <g>
        ${Array.from({length: 20}, (_, i) => `
          <g transform="translate(${7 + i * 14.5}, 5)">
            <polygon points="7,0 14,7 7,14 0,7" fill="#1a4d7c"/>
            <polygon points="7,2 12,7 7,12 2,7" fill="white"/>
            <polygon points="7,4 10,7 7,10 4,7" fill="#1a4d7c"/>
          </g>
        `).join('')}
      </g>
      
      <!-- Diamond pattern - bottom row -->
      <g>
        ${Array.from({length: 20}, (_, i) => `
          <g transform="translate(${7 + i * 14.5}, 191)">
            <polygon points="7,0 14,7 7,14 0,7" fill="#1a4d7c"/>
            <polygon points="7,2 12,7 7,12 2,7" fill="white"/>
            <polygon points="7,4 10,7 7,10 4,7" fill="#1a4d7c"/>
          </g>
        `).join('')}
      </g>
      
      <!-- Diamond pattern - left column -->
      <g>
        ${Array.from({length: 13}, (_, i) => `
          <g transform="translate(0, ${12 + i * 14.5})">
            <polygon points="7,0 14,7 7,14 0,7" fill="#1a4d7c"/>
            <polygon points="7,2 12,7 7,12 2,7" fill="white"/>
            <polygon points="7,4 10,7 7,10 4,7" fill="#1a4d7c"/>
          </g>
        `).join('')}
      </g>
      
      <!-- Diamond pattern - right column -->
      <g>
        ${Array.from({length: 13}, (_, i) => `
          <g transform="translate(283, ${12 + i * 14.5})">
            <polygon points="7,0 14,7 7,14 0,7" fill="#1a4d7c"/>
            <polygon points="7,2 12,7 7,12 2,7" fill="white"/>
            <polygon points="7,4 10,7 7,10 4,7" fill="#1a4d7c"/>
          </g>
        `).join('')}
      </g>
      
      <!-- Inner white area with blue border -->
      <rect x="14" y="14" width="269" height="182" fill="white" stroke="#1a4d7c" stroke-width="0.5"/>
    </svg>
    
    <!-- Certificate content -->
    <div class="certificate-content">
      <!-- Bismillah -->
      <div class="bismillah">بسم الله الرحمن الرحيم</div>
      
      <!-- Header row with logos -->
      <div class="header-row">
        <div class="header-english">
          THE REPUBLIC OF THE GAMBIA<br/>
          DEPARTMENT OF STATE FOR<br/>
          BASIC AND SECONDARY<br/>
          EDUCATION<br/>
          <em>The General Secretariat for Islamic/<br/>
          Arabic Education<br/>
          In The Gambia</em>
        </div>
        
        <div class="header-logo">
          ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Coat of Arms" />` : ''}
        </div>
        
        <div class="header-arabic">
          جمهوريـــــــــة غامبيـــــــا<br/>
          وزارة التربية و التعليم الأساسي<br/>
          الأمانة العامة للتعليم الاسلامي العربي<br/>
          في غامبيا
        </div>
      </div>
      
      <!-- Certificate titles -->
      <div class="title-section">
        <div class="title-english">GAMBIA MADRASSAH PRIMARY CERTIFICATE</div>
        <div class="title-arabic">شهادة إتمام دراسة المرحلة الابتدائية</div>
      </div>
      
      <!-- Certificate body text -->
      <div class="body-text">
        <p>
          تشهد الأمانة العامّة بأنّ ${studentLabel}/ <span class="highlight">${fullName}</span> ${bornLabel} في <span class="highlight">${student.placeOfBirth || ''}</span> بتاريخ :
          <span class="highlight">${dobFormatted}</span> م قد ${completedLabel} دراسة المرحلة الابتدائية في <span class="highlight">${schoolWithAddress}</span> بعد أن ${passedLabel}
          في الامتحان النهائي الذي أشرفت عليه الأمانة العامّة بالتنسيق مع وزارة التربية والتعليم في غامبيا.
        </p>
        <p>
          في الفترة: <span class="highlight">${academicYear}</span> , وكان ${gradeLabel} فيه ( <span class="highlight">${gradeWordAr}</span> ).
        </p>
      </div>
      
      <!-- Registration info -->
      <div class="registration-info">
        <p>
          سُجّلت هذه الشّهادة تحت رقم ( <span class="highlight">${certificateNumber}</span> ) بتاريخ : <span class="highlight">${issueDateHijri}</span> هـ الموافق
          <span class="highlight">${issueDateGreg}</span> م
        </p>
      </div>
      
      <!-- Signature section -->
      <div class="signature-section">
        <div class="signature-block">
          <div class="signature-title">توقيع مدير المدرسة</div>
          <div class="signature-line">........................</div>
          <div class="stamp-label">تصديق جهة الإشراف على المدرسة</div>
        </div>
        
        <div class="signature-block">
          <div class="signature-title">الختم الرسمي</div>
          <div style="height: 15mm;"></div>
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
  
  // Read logo image if exists
  let logoBase64 = '';
  const logoPath = path.join(process.cwd(), 'attached_assets', 'Amana_Logo_1765049398386.png');
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = logoBuffer.toString('base64');
  }
  
  // Read template if it exists (for future use with blank template)
  let templateBase64 = '';
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'primary_certificate_template.png');
  if (fs.existsSync(templatePath)) {
    const templateBuffer = fs.readFileSync(templatePath);
    templateBase64 = templateBuffer.toString('base64');
  }
  
  // Generate the HTML
  const html = generateCertificateHTML(data, templateBase64, logoBase64);
  
  // Generate PDF using Puppeteer
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
    
    // Set content and wait for fonts to load
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000
    });
    
    // Wait for fonts to load
    await page.evaluateHandle('document.fonts.ready');
    
    // Additional wait to ensure everything is rendered
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate unique filename
    const filename = `primary_cert_${student.id}_${certificateNumber.replace(/\//g, '-')}_${Date.now()}.pdf`;
    const pdfPath = path.join(outputDir, filename);
    
    // Generate high-quality PDF
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    
    return pdfPath;
  } finally {
    await browser.close();
  }
}

// Validate certificate requirements
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

// Export for compatibility
export { generateCertificateHTML };
