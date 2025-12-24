import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { getSharedBrowser } from './chromiumHelper';

// Arabic to English Transliteration Map
const ARABIC_TO_ENGLISH_MAP: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
  'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'ة': 'a', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ء': "'", 'ئ': 'e',
  'ؤ': 'o', 'ـ': '', ' ': ' ',
  // Short vowels (diacritics) - usually not written but included for completeness
  'َ': 'a', 'ِ': 'i', 'ُ': 'u', 'ً': 'an', 'ٍ': 'in', 'ٌ': 'un',
  'ّ': '', 'ْ': '',
};

// Common Arabic name transliterations (name-specific mappings)
const COMMON_NAME_TRANSLITERATIONS: Record<string, string> = {
  // Common Arabic first names - Male
  'محمد': 'Mohammed', 'أحمد': 'Ahmed', 'علي': 'Ali', 'عمر': 'Omar',
  'عثمان': 'Uthman', 'أبوبكر': 'Abubakar', 'عبدو': 'Abdou', 'يحي': 'Yahya',
  'إبراهيم': 'Ibrahim', 'إسماعيل': 'Ismail', 'يوسف': 'Yusuf', 'يحيى': 'Yahya',
  'موسى': 'Musa', 'عيسى': 'Isa', 'داود': 'Dawud', 'سليمان': 'Sulaiman',
  'خالد': 'Khalid', 'سعيد': 'Said', 'صالح': 'Saleh', 'حسن': 'Hassan',
  'حسين': 'Hussein', 'مصطفى': 'Mustafa', 'مصطفي': 'Mustafa', 'محمود': 'Mahmoud',
  'كريم': 'Karim', 'حمزة': 'Hamza', 'بشير': 'Bashir', 'تيدا': 'Tida',
  'لامين': 'Lamin', 'لامن': 'Lamin', 'عبدالرحمن': 'Abdurrahman',
  // Common Arabic first names - Female  
  'فاطمة': 'Fatima', 'عائشة': 'Aisha', 'خديجة': 'Khadija', 'مريم': 'Mariam',
  'زينب': 'Zainab', 'أمينة': 'Amina', 'آمنة': 'Amina', 'أمنة': 'Amina',
  'حليمة': 'Halima', 'رقية': 'Ruqayya', 'سارة': 'Sarah', 'هاجر': 'Hajar',
  'ليلى': 'Laila', 'نور': 'Noor', 'سلمى': 'Salma', 'حواء': 'Hawa',
  'ميمونة': 'Maimouna', 'آسية': 'Asiya', 'نفيسة': 'Nafisa', 'صفية': 'Safiya',
  'خديحة': 'Khadija', 'حوي': 'Hawa', 'أليمة': 'Alima',
  // Name prefixes/suffixes
  'عبد': 'Abd', 'الله': 'Allah', 'عبدالله': 'Abdullah', 'عبد الله': 'Abdullah',
  'عبد الرحمن': 'Abdurrahman',
  'بنت': 'Bint', 'بن': 'Bin', 'أبو': 'Abu', 'أم': 'Umm', 'ابن': 'Ibn',
  'العزيز': 'Al-Aziz', 'الكريم': 'Al-Karim', 'الوهاب': 'Al-Wahhab',
  // Common Gambian/West African family names
  'جالو': 'Jallow', 'سيسي': 'Ceesay', 'سيسى': 'Ceesay', 'جاتا': 'Jatta',
  'كولي': 'Colley', 'باه': 'Bah', 'توري': 'Touray', 'ساني': 'Sanneh',
  'سانو': 'Sanyang', 'سانيا': 'Sanneh', 'مارون': 'Marong', 'دابو': 'Darboe',
  'جوف': 'Joof', 'سيك': 'Secka', 'غسام': 'Gassama', 'كمارا': 'Camara',
  'دانصو': 'Danso', 'انجاي': 'Njie', 'نجاي': 'Njie', 'باجي': 'Bajie',
  'ساجو': 'Sajo', 'فاتي': 'Fatty', 'منتي': 'Minteh', 'كانتي': 'Kanteh',
  'سيدي': 'Sidibeh', 'باجوا': 'Bajua', 'درامي': 'Drammeh', 'تنكارا': 'Tunkara',
  'كونتي': 'Conteh', 'سيلا': 'Sillah', 'جام': 'Jeng', 'براجي': 'Baragi',
  'بوجا': 'Bojang', 'جنم': 'Janneh', 'جوب': 'Jobe', 'نبانغ': 'Nbange',
  'جيت': 'Jittey', 'دفي': 'Daffeh', 'جايتي': 'Jaity', 'تيام': 'Tiam',
  'صو': 'Sow', 'سنكو': 'Sanko', 'جوارى': 'Jawara', 'جاجو': 'Jago',
  'دكوري': 'Dukureh', 'مغرغا': 'Magharqa', 'ساو': 'Sow', 'كيت': 'Kate',
  'دهب': 'Dahab', 'سواني': 'Sawaneh', 'سافج': 'Savage', 'بلدي': 'Baldeh',
  // Al- prefixed names
  'الأمين': 'Al-Amin', 'الحسن': 'Al-Hassan', 'الحسين': 'Al-Hussain',
  'الإمام': 'Al-Imam', 'القاسم': 'Al-Qasim',
  // School-related terms
  'معهد': 'Institute', 'مدرسة': 'School', 'دار': 'Dar', 'الإسلامية': 'Islamic',
  'الإسلامي': 'Islamic', 'العربية': 'Arabic', 'العربي': 'Arabic',
  'العليا': 'Higher', 'الثانوية': 'Secondary', 'الابتدائية': 'Primary',
  'الآثار': 'Al-Athar', 'النور': 'Al-Noor', 'الهدى': 'Al-Huda',
  'الإنجليزي': 'English', 'يدالي': 'Yadali', 'مالك': 'Malik',
  'بندن': 'Banden', 'ماسان': 'Masan',
};

// Transliterate a single Arabic word/token to English
function transliterateWord(word: string): string {
  if (!word) return '';
  
  // Check if the entire word is in the common names dictionary
  if (COMMON_NAME_TRANSLITERATIONS[word]) {
    return COMMON_NAME_TRANSLITERATIONS[word];
  }
  
  // Character-by-character transliteration
  let transliterated = '';
  for (const char of word) {
    if (ARABIC_TO_ENGLISH_MAP[char] !== undefined) {
      transliterated += ARABIC_TO_ENGLISH_MAP[char];
    } else if (/[\u0600-\u06FF]/.test(char)) {
      // Unknown Arabic character - skip diacritics, use placeholder for others
      transliterated += '';
    }
  }
  
  // Capitalize first letter
  if (transliterated.length > 0) {
    return transliterated.charAt(0).toUpperCase() + transliterated.slice(1).toLowerCase();
  }
  return transliterated;
}

// Transliterate Arabic text to English (tokenized approach)
export function transliterateArabicToEnglish(arabicText: string): string {
  if (!arabicText) return '';
  
  // Split into tokens (words)
  const words = arabicText.trim().split(/\s+/);
  
  // Transliterate each word separately
  const transliteratedWords = words.map(word => {
    // Check for compound name patterns first (e.g., عبدالله, عبدالرحمن)
    if (COMMON_NAME_TRANSLITERATIONS[word]) {
      return COMMON_NAME_TRANSLITERATIONS[word];
    }
    
    // Try to find matching substrings for compound names
    let matched = false;
    for (const [arabic, english] of Object.entries(COMMON_NAME_TRANSLITERATIONS)) {
      if (word === arabic) {
        return english;
      }
    }
    
    // Transliterate character by character
    return transliterateWord(word);
  });
  
  return transliteratedWords.filter(w => w.length > 0).join(' ');
}

// Generate unique transcript number
export function generateTranscriptNumber(examYear: number, sequenceNumber: number): string {
  const paddedSequence = sequenceNumber.toString().padStart(6, '0');
  return `G6TR-${examYear}-${paddedSequence}`;
}

// Generate secure QR token
export function generateQRToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

// Generate QR code as data URL
export async function generateQRCodeDataUrl(verificationUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      width: 200,
      color: { dark: '#000000', light: '#FFFFFF' }
    });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}

// Grade 6 Subject Definitions (13 subjects as per template)
export const GRADE_6_SUBJECTS = [
  { id: 1, arabicName: 'القرآن الكريم', englishName: 'Quran', code: 'QURAN', maxScore: 100, minScore: 50 },
  { id: 2, arabicName: 'الحديث', englishName: 'Hadith', code: 'HADITH', maxScore: 100, minScore: 50 },
  { id: 3, arabicName: 'التوحيد', englishName: 'Tawheed', code: 'TAWHEED', maxScore: 100, minScore: 50 },
  { id: 4, arabicName: 'الفقه', englishName: 'Fiqh', code: 'FIQH', maxScore: 100, minScore: 50 },
  { id: 5, arabicName: 'السيرة', englishName: 'Seerah', code: 'SEERAH', maxScore: 100, minScore: 50 },
  { id: 6, arabicName: 'القراءة والمحفوظات', englishName: 'Reading & Memorization', code: 'READING', maxScore: 100, minScore: 50 },
  { id: 7, arabicName: 'الكتابة (الإملاء والخط)', englishName: 'Writing (Dictation & Handwriting)', code: 'WRITING', maxScore: 100, minScore: 50 },
  { id: 8, arabicName: 'التعبير', englishName: 'Expression', code: 'EXPRESSION', maxScore: 100, minScore: 50 },
  { id: 9, arabicName: 'القواعد', englishName: 'Grammar', code: 'GRAMMAR', maxScore: 100, minScore: 50 },
  { id: 10, arabicName: 'Science', englishName: 'Science', code: 'SCIENCE', maxScore: 100, minScore: 50 },
  { id: 11, arabicName: 'Mathematics', englishName: 'Mathematics', code: 'MATH', maxScore: 100, minScore: 50 },
  { id: 12, arabicName: 'S.E.S', englishName: 'Social & Environmental Studies', code: 'SES', maxScore: 100, minScore: 50 },
  { id: 13, arabicName: 'English', englishName: 'English', code: 'ENGLISH', maxScore: 100, minScore: 50 },
];

// Total maximum marks for Grade 6 (13 subjects × 100)
export const TOTAL_MAX_MARKS = GRADE_6_SUBJECTS.reduce((sum, s) => sum + s.maxScore, 0);

// Arabic text cleaner for robust matching
export function cleanArabicText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\s+/g, ' ')           // Normalize multiple spaces
    .replace(/ـ/g, '')              // Remove tatweel
    .replace(/[أإآ]/g, 'ا')         // Normalize alef forms
    .replace(/ة/g, 'ه')             // Normalize taa marbouta
    .replace(/ى/g, 'ي')             // Normalize alef maqsura
    .replace(/[،؛؟]/g, '')          // Remove Arabic punctuation
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48)) // Arabic to English digits
    .trim();
}

// Grade calculation based on percentage
export function calculateFinalGrade(percentage: number): { arabic: string; english: string } {
  if (percentage >= 85) return { arabic: 'ممتاز', english: 'Excellent' };
  if (percentage >= 75) return { arabic: 'جيد جدا', english: 'Very Good' };
  if (percentage >= 65) return { arabic: 'جيد', english: 'Good' };
  if (percentage >= 50) return { arabic: 'مقبول', english: 'Pass' };
  return { arabic: 'راسب', english: 'Fail' };
}

// Nationality translation mapping
const NATIONALITY_MAP: Record<string, string> = {
  'غامبي': 'Gambian',
  'غامبية': 'Gambian',
  'نيجيري': 'Nigerian',
  'نيجيرية': 'Nigerian',
  'سنغالي': 'Senegalese',
  'سنغالية': 'Senegalese',
  'مالي': 'Malian',
  'مالية': 'Malian',
  'غيني': 'Guinean',
  'غينية': 'Guinean',
  'سيراليوني': 'Sierra Leonean',
  'سيراليونية': 'Sierra Leonean',
  'موريتاني': 'Mauritanian',
  'موريتانية': 'Mauritanian',
  'gambian': 'Gambian',
  'nigerian': 'Nigerian',
  'senegalese': 'Senegalese',
  'malian': 'Malian',
  'guinean': 'Guinean',
};

export function translateNationality(arabicNationality: string): string {
  const cleaned = cleanArabicText(arabicNationality).toLowerCase();
  return NATIONALITY_MAP[cleaned] || NATIONALITY_MAP[arabicNationality.toLowerCase()] || arabicNationality;
}

export interface TranscriptStudentData {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  firstNameEn?: string | null;
  lastNameEn?: string | null;
  middleNameEn?: string | null;
  nationality?: string | null;
  nationalityEn?: string | null;
  gender: 'male' | 'female';
  indexNumber: string | null;
}

export interface TranscriptSchoolData {
  id: number;
  name: string;
  nameEn?: string | null;
}

export interface TranscriptExamYearData {
  id: number;
  year: number;
}

export interface SubjectMark {
  subjectCode: string;
  arabicName: string;
  englishName: string;
  mark: number | null;
  maxScore: number;
  minScore: number;
}

export interface TranscriptData {
  student: TranscriptStudentData;
  school: TranscriptSchoolData;
  examYear: TranscriptExamYearData;
  subjectMarks: SubjectMark[];
  totalMarks: number;
  totalMaxMarks: number;
  percentage: number;
  finalGrade: { arabic: string; english: string };
  transcriptNumber?: string;
  qrCodeDataUrl?: string;
}

export interface TranscriptValidationResult {
  isValid: boolean;
  errors: string[];
  errorsAr: string[];
}

export function validateTranscriptRequirements(data: Partial<TranscriptData>): TranscriptValidationResult {
  const errors: string[] = [];
  const errorsAr: string[] = [];

  if (!data.student) {
    errors.push('Student data is required');
    errorsAr.push('بيانات الطالب مطلوبة');
  } else {
    // Accept names where firstName exists (works for both English and Arabic names)
    if (!data.student.firstName || data.student.firstName.trim().length === 0) {
      errors.push('Student Arabic name is required');
      errorsAr.push('اسم الطالب بالعربية مطلوب');
    }
    if (!data.student.nationality) {
      errors.push('Nationality is required');
      errorsAr.push('الجنسية مطلوبة');
    }
  }

  if (!data.school) {
    errors.push('School data is required');
    errorsAr.push('بيانات المدرسة مطلوبة');
  } else if (!data.school.name) {
    errors.push('School Arabic name is required');
    errorsAr.push('اسم المدرسة بالعربية مطلوب');
  }

  if (!data.subjectMarks || data.subjectMarks.length === 0) {
    errors.push('No subject marks exist');
    errorsAr.push('لا توجد درجات للمواد');
  } else {
    const hasAnyMark = data.subjectMarks.some(m => m.mark !== null && m.mark !== undefined);
    if (!hasAnyMark) {
      errors.push('At least one subject mark is required');
      errorsAr.push('يجب إدخال درجة واحدة على الأقل');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    errorsAr,
  };
}

const outputDir = path.join(process.cwd(), 'generated_transcripts');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// HTML template-based transcript generation using Puppeteer for proper Arabic text rendering
function generateTranscriptHTML(data: TranscriptData, logoBase64: string, qrCodeDataUrl: string): string {
  const { student, school, examYear, subjectMarks, totalMarks, percentage, finalGrade } = data;
  
  const fullNameAr = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
  const nationalityAr = student.nationality || 'غامبي';
  const schoolNameAr = school.name;
  const transcriptNumber = data.transcriptNumber || '';
  
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
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 0; }
    html, body {
      width: 210mm; height: 297mm; margin: 0; padding: 0;
      font-family: 'Amiri', 'Traditional Arabic', serif;
      background: white;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .container {
      width: 210mm; height: 297mm; padding: 15mm 15mm 10mm 15mm;
      position: relative;
    }
    .watermark {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.06; z-index: 0; pointer-events: none;
    }
    .watermark img { width: 180mm; }
    .content { position: relative; z-index: 1; }
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 8mm;
    }
    .header-english {
      text-align: left; font-family: 'Times New Roman', serif;
      font-size: 10pt; line-height: 1.4; width: 45mm;
    }
    .header-logo { text-align: center; width: 30mm; }
    .header-logo img { width: 20mm; height: 20mm; }
    .header-arabic {
      text-align: right; font-size: 12pt; line-height: 1.5;
      width: 55mm; direction: rtl;
    }
    .header-separator { border-top: 1px solid #333; margin: 4mm 0; }
    .main-title {
      text-align: center; font-size: 16pt; font-weight: bold;
      margin-bottom: 4mm; direction: rtl;
    }
    .transcript-number {
      text-align: center; font-size: 10pt; margin-bottom: 6mm; direction: rtl;
    }
    .student-info {
      display: flex; justify-content: space-between;
      margin-bottom: 6mm; padding: 3mm;
      border: 1px solid #ddd; background: #fafafa;
    }
    .student-info-left { text-align: left; font-size: 10pt; line-height: 1.8; }
    .student-info-right { text-align: right; font-size: 11pt; line-height: 1.8; direction: rtl; }
    .student-info .label { color: #333; }
    .student-info .value { color: #1a5276; font-weight: bold; }
    table {
      width: 100%; border-collapse: collapse;
      margin-bottom: 6mm; direction: rtl;
    }
    table th {
      background: #d5d5d5; padding: 2.5mm; border: 1px solid #999;
      font-size: 10pt; font-weight: bold; text-align: center;
    }
    table td {
      padding: 2mm; border: 1px solid #ccc;
      font-size: 10pt; text-align: center;
    }
    table tr.even { background: #fff; }
    table tr.odd { background: #f5f5f5; }
    table td.subject { text-align: right; padding-right: 4mm; }
    table td.score { color: #1a5276; font-weight: bold; }
    table td.index { width: 8mm; }
    table td.number { width: 15mm; }
    .summary-row { background: #d5d5d5 !important; font-weight: bold; }
    .percentage-row { background: #f5f5f5 !important; }
    .grade-row { background: #c8e6c9 !important; }
    .grade-row td { color: #155724; font-weight: bold; font-size: 12pt; }
    .signatures {
      display: flex; justify-content: space-between;
      margin-top: 8mm; padding-top: 4mm;
    }
    .signature-block { text-align: center; width: 45%; }
    .signature-line {
      border-top: 1px solid #999;
      margin: 8mm auto 2mm auto; width: 80%;
    }
    .signature-label-en {
      font-family: 'Times New Roman', serif; font-size: 9pt; margin-bottom: 2mm;
    }
    .signature-label-ar { font-size: 10pt; direction: rtl; }
    .footer {
      display: flex; justify-content: space-between;
      align-items: flex-end; margin-top: 10mm;
    }
    .qr-section { text-align: left; }
    .qr-section img { width: 18mm; height: 18mm; }
    .qr-number { font-size: 8pt; margin-top: 2mm; font-family: monospace; }
    .verify-text { text-align: right; font-size: 9pt; color: #666; direction: rtl; }
    .verify-text-ar { margin-bottom: 2mm; }
    .verify-text-en { font-family: 'Times New Roman', serif; }
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
          <div><span class="label">Student Name:</span> <span class="value">${transliterateArabicToEnglish(fullNameAr)}</span></div>
          <div><span class="label">Nationality:</span> <span class="value">${transliterateArabicToEnglish(nationalityAr)}</span></div>
          <div><span class="label">School:</span> <span class="value">${transliterateArabicToEnglish(schoolNameAr)}</span></div>
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

export async function generateTranscriptPDF(data: TranscriptData): Promise<string> {
  const validation = validateTranscriptRequirements(data);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errorsAr.join(', ')}`);
  }

  // Load logo for embedding
  const logoPath = path.join(process.cwd(), 'public', 'amaanah-logo.png');
  let logoBase64 = '';
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = logoBuffer.toString('base64');
  }
  
  // Generate QR code
  const verifyUrl = `https://amaanah.gm/verify/${data.qrToken || 'preview'}`;
  const qrCodeDataUrl = data.qrCodeDataUrl || await QRCode.toDataURL(verifyUrl, {
    width: 150,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  });
  
  const html = generateTranscriptHTML(data, logoBase64, qrCodeDataUrl);
  
  const fileName = `transcript_g6_${data.student.indexNumber || data.student.id}_${Date.now()}.pdf`;
  const filePath = path.join(outputDir, fileName);
  
  // Use Puppeteer for proper Arabic text rendering
  const browser = await getSharedBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true
    });
    
    console.log(`[Transcript PDF] Successfully generated: ${filePath}`);
    return filePath;
  } finally {
    await page.close();
  }
}

// Helper to build TranscriptData from database records
export function buildTranscriptData(
  student: TranscriptStudentData,
  school: TranscriptSchoolData,
  examYear: TranscriptExamYearData,
  marks: Map<string, number | null>
): TranscriptData {
  // Build subject marks array
  const subjectMarks: SubjectMark[] = GRADE_6_SUBJECTS.map(subject => ({
    subjectCode: subject.code,
    arabicName: subject.arabicName,
    englishName: subject.englishName,
    mark: marks.get(subject.code) ?? null,
    maxScore: subject.maxScore,
    minScore: subject.minScore,
  }));

  // Calculate totals
  let totalMarks = 0;
  let subjectsWithMarks = 0;
  
  for (const sm of subjectMarks) {
    if (sm.mark !== null && sm.mark !== undefined) {
      totalMarks += sm.mark;
      subjectsWithMarks++;
    }
  }

  // Calculate percentage based on subjects that have marks
  const totalMaxMarks = subjectsWithMarks * 100;
  const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
  const finalGrade = calculateFinalGrade(percentage);

  return {
    student,
    school,
    examYear,
    subjectMarks,
    totalMarks,
    totalMaxMarks,
    percentage,
    finalGrade,
  };
}
