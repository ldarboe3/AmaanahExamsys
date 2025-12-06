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
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .certificate-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
    }
    
    .border-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      pointer-events: none;
    }
    
    .content-layer {
      position: absolute;
      top: 12mm;
      left: 12mm;
      right: 12mm;
      bottom: 12mm;
      background: white;
      z-index: 2;
      display: flex;
      flex-direction: column;
      padding: 6mm 10mm;
      border: 1.5px solid #0C2B64;
    }
    
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 120mm;
      height: auto;
      opacity: 0.15;
      z-index: 0;
      pointer-events: none;
    }
    
    .bismillah {
      text-align: center;
      font-size: 16pt;
      font-weight: normal;
      color: #000;
      margin-bottom: 3mm;
      font-family: 'Amiri', serif;
    }
    
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 3mm;
      direction: ltr;
    }
    
    .header-english {
      flex: 1;
      text-align: left;
      font-size: 7.5pt;
      line-height: 1.2;
      font-family: 'Times New Roman', serif;
      color: #000;
      text-transform: uppercase;
    }
    
    .header-english em {
      text-transform: none;
      font-style: italic;
    }
    
    .header-logo {
      flex: 0 0 auto;
      text-align: center;
      padding: 0 5mm;
    }
    
    .header-logo img {
      width: 30mm;
      height: auto;
      max-height: 22mm;
      object-fit: contain;
    }
    
    .header-arabic {
      flex: 1;
      text-align: right;
      font-size: 9pt;
      line-height: 1.3;
      font-family: 'Amiri', serif;
      direction: rtl;
      color: #000;
    }
    
    .title-section {
      text-align: center;
      margin: 2mm 0 4mm 0;
    }
    
    .title-english {
      font-size: 12pt;
      font-weight: bold;
      letter-spacing: 1px;
      color: #000;
      font-family: 'Times New Roman', serif;
      margin-bottom: 1mm;
    }
    
    .title-arabic {
      font-size: 14pt;
      font-weight: bold;
      color: #000;
      font-family: 'Amiri', serif;
    }
    
    .body-text {
      direction: rtl;
      text-align: right;
      font-size: 10.5pt;
      line-height: 1.9;
      color: #000;
      font-family: 'Amiri', serif;
      padding: 0 8mm;
      flex: 1;
    }
    
    .body-text p {
      margin-bottom: 0;
    }
    
    .highlight {
      color: #C00000;
      font-weight: bold;
      font-style: italic;
    }
    
    .registration-info {
      direction: rtl;
      text-align: right;
      font-size: 10pt;
      line-height: 1.6;
      padding: 0 8mm;
      margin-top: 2mm;
    }
    
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 6mm;
      padding: 0 15mm;
      direction: rtl;
    }
    
    .signature-block {
      text-align: center;
      width: 28%;
    }
    
    .signature-title {
      font-size: 8pt;
      color: #000;
      margin-bottom: 8mm;
    }
    
    .signature-line {
      border-top: 1px dotted #000;
      margin-top: 8mm;
      font-size: 8pt;
      letter-spacing: 2px;
    }
    
    .stamp-label {
      font-size: 7pt;
      color: #333;
      margin-top: 2mm;
    }
  </style>
</head>
<body>
  <div class="certificate-wrapper">
    <svg class="border-layer" viewBox="0 0 297 210" preserveAspectRatio="none">
      <defs>
        <pattern id="yellowTriangles" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
          <rect width="10" height="10" fill="#F5B800"/>
          <polygon points="0,0 5,5 0,10" fill="#F5B800"/>
          <polygon points="10,0 5,5 10,10" fill="#F5B800"/>
        </pattern>
      </defs>
      
      <rect x="0" y="0" width="297" height="210" fill="#F5B800"/>
      
      <g id="top-border">
        ${Array.from({length: 30}, (_, i) => {
          const x = i * 10;
          return `<polygon points="${x},0 ${x+5},10 ${x+10},0" fill="white"/>`;
        }).join('')}
      </g>
      
      <g id="bottom-border">
        ${Array.from({length: 30}, (_, i) => {
          const x = i * 10;
          return `<polygon points="${x},210 ${x+5},200 ${x+10},210" fill="white"/>`;
        }).join('')}
      </g>
      
      <g id="left-border">
        ${Array.from({length: 21}, (_, i) => {
          const y = i * 10;
          return `<polygon points="0,${y} 10,${y+5} 0,${y+10}" fill="white"/>`;
        }).join('')}
      </g>
      
      <g id="right-border">
        ${Array.from({length: 21}, (_, i) => {
          const y = i * 10;
          return `<polygon points="297,${y} 287,${y+5} 297,${y+10}" fill="white"/>`;
        }).join('')}
      </g>
      
      <g id="top-diamonds">
        ${Array.from({length: 15}, (_, i) => {
          const x = 10 + i * 19;
          return `
            <polygon points="${x},0 ${x+5},5 ${x},10 ${x-5},5" fill="#0C2B64"/>
            <polygon points="${x},1.5 ${x+3.5},5 ${x},8.5 ${x-3.5},5" fill="white"/>
            <polygon points="${x},3 ${x+2},5 ${x},7 ${x-2},5" fill="#0C2B64"/>
          `;
        }).join('')}
      </g>
      
      <g id="bottom-diamonds">
        ${Array.from({length: 15}, (_, i) => {
          const x = 10 + i * 19;
          return `
            <polygon points="${x},200 ${x+5},205 ${x},210 ${x-5},205" fill="#0C2B64"/>
            <polygon points="${x},201.5 ${x+3.5},205 ${x},208.5 ${x-3.5},205" fill="white"/>
            <polygon points="${x},203 ${x+2},205 ${x},207 ${x-2},205" fill="#0C2B64"/>
          `;
        }).join('')}
      </g>
      
      <g id="left-diamonds">
        ${Array.from({length: 11}, (_, i) => {
          const y = 10 + i * 19;
          return `
            <polygon points="0,${y} 5,${y+5} 0,${y+10} -5,${y+5}" fill="#0C2B64"/>
            <polygon points="1.5,${y+5} 5,${y+1.5} 8.5,${y+5} 5,${y+8.5}" fill="white" transform="translate(-3.5,0)"/>
            <polygon points="3,${y+5} 5,${y+3} 7,${y+5} 5,${y+7}" fill="#0C2B64" transform="translate(-3.5,0)"/>
          `;
        }).join('')}
      </g>
      
      <g id="right-diamonds">
        ${Array.from({length: 11}, (_, i) => {
          const y = 10 + i * 19;
          return `
            <polygon points="297,${y} 302,${y+5} 297,${y+10} 292,${y+5}" fill="#0C2B64"/>
            <polygon points="295.5,${y+5} 297,${y+1.5} 298.5,${y+5} 297,${y+8.5}" fill="white"/>
            <polygon points="296,${y+5} 297,${y+4} 298,${y+5} 297,${y+6}" fill="#0C2B64"/>
          `;
        }).join('')}
      </g>
      
      <rect x="10" y="10" width="277" height="190" fill="white"/>
    </svg>
    
    ${logoBase64 ? `<img class="watermark" src="data:image/png;base64,${logoBase64}" alt="" />` : ''}
    
    <div class="content-layer">
      <div class="bismillah">بسم الله الرحمن الرحيم</div>
      
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
          ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo" />` : ''}
        </div>
        
        <div class="header-arabic">
          جمهوريـــــــــة غامبيـــــــا<br/>
          وزارة التربية و التعليم الأساسي<br/>
          الأمانة العامة للتعليم الاسلامي العربي<br/>
          في غامبيا
        </div>
      </div>
      
      <div class="title-section">
        <div class="title-english">GAMBIA MADRASSAH PRIMARY CERTIFICATE</div>
        <div class="title-arabic">شهادة إتمام دراسة المرحلة الابتدائية</div>
      </div>
      
      <div class="body-text">
        <p>
          تشهد الأمانة العامّة بأنّ ${studentLabel}/ <span class="highlight">{${fullName}}</span> ${bornLabel} في <span class="highlight">{${student.placeOfBirth || ''}}</span> بتاريخ :
          <span class="highlight">{${dobFormatted}}</span> م قد ${completedLabel} دراسة المرحلة الابتدائية في <span class="highlight">{${schoolWithAddress}}</span> بعد أن ${passedLabel}
          في الامتحان النهائي الذي أشرفت عليه الأمانة العامّة بالتنسيق مع وزارة التربية والتعليم في غامبيا.
        </p>
        <p>
          في الفترة: <span class="highlight">{${academicYear}}</span> , وكان ${gradeLabel} فيه ( <span class="highlight">{${gradeWordAr}}</span> ).
        </p>
      </div>
      
      <div class="registration-info">
        <p>
          سُجّلت هذه الشّهادة تحت رقم ( <span class="highlight">{${certificateNumber}}</span> ) بتاريخ : <span class="highlight">{${issueDateHijri}}</span> هـ الموافق
          <span class="highlight">{${issueDateGreg}}</span> م
        </p>
      </div>
      
      <div class="signature-section">
        <div class="signature-block">
          <div class="signature-title">توقيع مدير المدرسة</div>
          <div class="signature-line">........................</div>
          <div class="stamp-label">تصديق جهة الإشراف على المدرسة</div>
        </div>
        
        <div class="signature-block">
          <div class="signature-title">الختم الرسمي</div>
          <div style="height: 12mm;"></div>
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
  const templatePath = path.join(process.cwd(), 'public', 'templates', 'primary_certificate_template.png');
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
    
    await page.setContent(html, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000
    });
    
    await page.evaluateHandle('document.fonts.ready');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const filename = `primary_cert_${student.id}_${certificateNumber.replace(/\//g, '-')}_${Date.now()}.pdf`;
    const pdfPath = path.join(outputDir, filename);
    
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
