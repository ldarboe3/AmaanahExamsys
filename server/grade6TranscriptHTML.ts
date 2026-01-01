import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import { getSharedBrowser } from './chromiumHelper';

interface TranscriptData {
  student: {
    id: number;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    indexNumber?: string | null;
    gender?: string;
    nationality?: string;
  };
  school: {
    id: number;
    name: string;
  };
  examYear: {
    id: number;
    year: number;
  };
  subjectMarks: Array<{
    subjectId: number;
    arabicName: string;
    englishName?: string;
    maxScore: number;
    minScore: number;
    mark: number | null;
  }>;
  totalMarks: number;
  percentage: number;
  finalGrade: {
    arabic: string;
    english: string;
  };
  transcriptNumber: string;
  qrToken: string;
}

const outputDir = path.join(process.cwd(), 'generated_transcripts');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function generateTranscriptHTML(data: TranscriptData, logoBase64: string, qrCodeDataUrl: string): string {
  const { student, school, examYear, subjectMarks, totalMarks, percentage, finalGrade, transcriptNumber } = data;
  
  const fullNameAr = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
  const nationalityAr = student.nationality || 'غامبي';
  const schoolNameAr = school.name;
  
  const subjectRows = subjectMarks.map((subject, index) => `
    <tr class="${index % 2 === 0 ? 'even' : 'odd'}">
      <td class="score">${subject.mark !== null && subject.mark !== undefined ? subject.mark : '-'}</td>
      <td class="number">${subject.minScore}</td>
      <td class="number">${subject.maxScore}</td>
      <td class="subject">${subject.arabicName}</td>
      <td class="index">${index + 1}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 0;
    }
    
    html, body {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      font-family: 'Amiri', 'Traditional Arabic', serif;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .container {
      width: 210mm;
      height: 297mm;
      padding: 15mm 15mm 10mm 15mm;
      position: relative;
    }
    
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.06;
      z-index: 0;
      pointer-events: none;
    }
    
    .watermark img {
      width: 180mm;
    }
    
    .content {
      position: relative;
      z-index: 1;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8mm;
    }
    
    .header-english {
      text-align: left;
      font-family: 'Times New Roman', serif;
      font-size: 10pt;
      line-height: 1.4;
      width: 45mm;
    }
    
    .header-logo {
      text-align: center;
      width: 30mm;
    }
    
    .header-logo img {
      width: 20mm;
      height: 20mm;
    }
    
    .header-arabic {
      text-align: right;
      font-size: 12pt;
      line-height: 1.5;
      width: 55mm;
      direction: rtl;
    }
    
    .header-separator {
      border-top: 1px solid #333;
      margin: 4mm 0;
    }
    
    .main-title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 4mm;
      direction: rtl;
    }
    
    .transcript-number {
      text-align: center;
      font-size: 10pt;
      margin-bottom: 6mm;
      direction: rtl;
    }
    
    .student-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6mm;
      padding: 3mm;
      border: 1px solid #ddd;
      background: #fafafa;
    }
    
    .student-info-left {
      text-align: left;
      font-size: 10pt;
      line-height: 1.8;
    }
    
    .student-info-right {
      text-align: right;
      font-size: 11pt;
      line-height: 1.8;
      direction: rtl;
    }
    
    .student-info .label {
      color: #333;
    }
    
    .student-info .value {
      color: #1a5276;
      font-weight: bold;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6mm;
      direction: rtl;
    }
    
    table th {
      background: #d5d5d5;
      padding: 2.5mm;
      border: 1px solid #999;
      font-size: 10pt;
      font-weight: bold;
      text-align: center;
    }
    
    table td {
      padding: 2mm;
      border: 1px solid #ccc;
      font-size: 10pt;
      text-align: center;
    }
    
    table tr.even {
      background: #fff;
    }
    
    table tr.odd {
      background: #f5f5f5;
    }
    
    table td.subject {
      text-align: right;
      padding-right: 4mm;
    }
    
    table td.score {
      color: #1a5276;
      font-weight: bold;
    }
    
    table td.index {
      width: 8mm;
    }
    
    table td.number {
      width: 15mm;
    }
    
    .summary-row {
      background: #d5d5d5 !important;
      font-weight: bold;
    }
    
    .percentage-row {
      background: #f5f5f5 !important;
    }
    
    .grade-row {
      background: #c8e6c9 !important;
    }
    
    .grade-row td {
      color: #155724;
      font-weight: bold;
      font-size: 12pt;
    }
    
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 8mm;
      padding-top: 4mm;
    }
    
    .signature-block {
      text-align: center;
      width: 45%;
    }
    
    .signature-line {
      border-top: 1px solid #999;
      margin: 8mm auto 2mm auto;
      width: 80%;
    }
    
    .signature-label-en {
      font-family: 'Times New Roman', serif;
      font-size: 9pt;
      margin-bottom: 2mm;
    }
    
    .signature-label-ar {
      font-size: 10pt;
      direction: rtl;
    }
    
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 10mm;
    }
    
    .qr-section {
      text-align: left;
    }
    
    .qr-section img {
      width: 18mm;
      height: 18mm;
    }
    
    .qr-number {
      font-size: 8pt;
      margin-top: 2mm;
      font-family: monospace;
    }
    
    .verify-text {
      text-align: right;
      font-size: 9pt;
      color: #666;
      direction: rtl;
    }
    
    .verify-text-ar {
      margin-bottom: 2mm;
    }
    
    .verify-text-en {
      font-family: 'Times New Roman', serif;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="watermark">
      <img src="data:image/png;base64,${logoBase64}" alt="watermark">
    </div>
    
    <div class="content">
      <div class="header">
        <div class="header-english">
          The General Secretariat for<br>
          Islamic/Arabic Education in<br>
          The Gambia<br>
          Examination affairs unit
        </div>
        <div class="header-logo">
          <img src="data:image/png;base64,${logoBase64}" alt="logo">
        </div>
        <div class="header-arabic">
          الأمانة العامة للتعليم الإسلامي العربي<br>
          في غامبيا<br>
          قسم الامتحانات
        </div>
      </div>
      
      <div class="header-separator"></div>
      
      <div class="main-title">
        كشف نتائج الامتحانات للشهادة الابتدائية للعام ${examYear.year}-${examYear.year - 1} م
      </div>
      
      <div class="transcript-number">
        Transcript No. / رقم الكشف: ${transcriptNumber}
      </div>
      
      <div class="student-info">
        <div class="student-info-left">
          <div><span class="label">Student Name:</span> <span class="value">${transliterateSimple(fullNameAr)}</span></div>
          <div><span class="label">Nationality:</span> <span class="value">${transliterateSimple(nationalityAr)}</span></div>
          <div><span class="label">School:</span> <span class="value">${transliterateSimple(schoolNameAr)}</span></div>
        </div>
        <div class="student-info-right">
          <div><span class="label">اسم الطالب/ة:</span> <span class="value">${fullNameAr}</span></div>
          <div><span class="label">الجنسية:</span> <span class="value">${nationalityAr}</span></div>
          <div><span class="label">المدرسة:</span> <span class="value">${schoolNameAr}</span></div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th style="width: 70px;">الدرجة المحققة</th>
            <th style="width: 60px;">الدرجات الصغرى</th>
            <th style="width: 60px;">الدرجات الكبرى</th>
            <th>المادة</th>
            <th style="width: 30px;">م</th>
          </tr>
        </thead>
        <tbody>
          ${subjectRows}
          <tr class="summary-row">
            <td colspan="1">${totalMarks}</td>
            <td colspan="3">مجموع الدرجات</td>
            <td></td>
          </tr>
          <tr class="percentage-row">
            <td colspan="1">${percentage.toFixed(1)}%</td>
            <td colspan="3">النسبة</td>
            <td></td>
          </tr>
          <tr class="grade-row">
            <td colspan="1">${finalGrade.arabic}</td>
            <td colspan="3">التقدير</td>
            <td></td>
          </tr>
        </tbody>
      </table>
      
      <div class="signatures">
        <div class="signature-block">
          <div class="signature-label-en">Exam Committee Chairman</div>
          <div class="signature-label-ar">توقيع رئيس لجنة الامتحانات</div>
          <div class="signature-line"></div>
        </div>
        <div class="signature-block">
          <div class="signature-label-en">Secretariat Administration</div>
          <div class="signature-label-ar">توقيع إدارة الأمانة</div>
          <div class="signature-line"></div>
        </div>
      </div>
      
      <div class="footer">
        <div class="qr-section">
          <img src="${qrCodeDataUrl}" alt="QR Code">
          <div class="qr-number">${transcriptNumber}</div>
        </div>
        <div class="verify-text">
          <div class="verify-text-ar">للتحقق من صحة هذا الكشف، استخدم رمز QR</div>
          <div class="verify-text-en">To verify this transcript, scan the QR code</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function transliterateSimple(text: string): string {
  if (!text) return '';
  
  const map: Record<string, string> = {
    'محمد': 'Mohammed', 'أحمد': 'Ahmed', 'علي': 'Ali', 'عمر': 'Omar',
    'أبوبكر': 'Abubakar', 'إبراهيم': 'Ibrahim', 'إسماعيل': 'Ismail',
    'فاطمة': 'Fatima', 'عائشة': 'Aisha', 'خديجة': 'Khadija', 'مريم': 'Mariam',
    'زينب': 'Zainab', 'آمنة': 'Amina', 'حليمة': 'Halima',
    'جالو': 'Jallow', 'سيسي': 'Ceesay', 'باه': 'Bah', 'توري': 'Touray',
    'كمارا': 'Camara', 'دابو': 'Darboe', 'سانو': 'Sanyang',
    'الصديق': 'Alsdyq', 'الإسلامية': 'Islamic', 'غامبي': 'Ghamby',
    'غامبية': 'Ghamby', 'الأمين': 'Al-Amin', 'سليمان': 'Sulaiman',
    'بايو': 'Bayw', 'مالند': 'Malnd', 'فنت': 'Fnt', 'منست': 'Mnst',
    'بكاي': 'Bkay'
  };
  
  let result = text;
  for (const [ar, en] of Object.entries(map)) {
    result = result.replace(new RegExp(ar, 'g'), en);
  }
  
  return result.replace(/[\u0600-\u06FF]/g, (c) => {
    const simple: Record<string, string> = {
      'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
      'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's',
      'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'q',
      'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
      'ة': 'a', 'ى': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ء': '', 'ئ': 'e', 'ؤ': 'o'
    };
    return simple[c] || '';
  });
}

export async function generateGrade6TranscriptHTML(data: TranscriptData): Promise<string> {
  const logoPath = path.join(process.cwd(), 'public', 'amaanah-logo.png');
  let logoBase64 = '';
  
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = logoBuffer.toString('base64');
  }
  
  const verifyUrl = `https://amaanah.gm/verify/${data.qrToken}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 150,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  });
  
  const html = generateTranscriptHTML(data, logoBase64, qrCodeDataUrl);
  
  const fileName = `transcript_g6_${data.student.indexNumber || data.student.id}_${Date.now()}.pdf`;
  const filePath = path.join(outputDir, fileName);
  
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true
    });
    
    return filePath;
  } finally {
    await page.close();
  }
}
