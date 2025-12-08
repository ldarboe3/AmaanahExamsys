import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import crypto from 'crypto';

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
    } else {
      transliterated += char;
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
    if (!data.student.firstName || !data.student.lastName) {
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

function generateTranscriptHTML(data: TranscriptData): string {
  const { student, school, examYear, subjectMarks, totalMarks, percentage, finalGrade } = data;
  
  // Load and embed logo as base64 data URL
  let logoDataUrl = '';
  try {
    const logoPath = path.join(process.cwd(), 'generated_transcripts', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoDataUrl = 'data:image/png;base64,' + logoBuffer.toString('base64');
    }
  } catch (e) {
    // Logo not available, continue without it
  }
  
  // Load and embed watermark logo as base64 data URL
  let watermarkDataUrl = '';
  try {
    const watermarkPath = path.join(process.cwd(), 'generated_transcripts', 'watermark_logo.png');
    if (fs.existsSync(watermarkPath)) {
      const watermarkBuffer = fs.readFileSync(watermarkPath);
      watermarkDataUrl = 'data:image/png;base64,' + watermarkBuffer.toString('base64');
    }
  } catch (e) {
    // Watermark not available, continue without it
  }
  
  // Build Arabic full name
  const fullNameAr = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(' ');
  
  // Build English full name using transliteration
  const fullNameEn = [
    student.firstNameEn || transliterateArabicToEnglish(student.firstName),
    student.middleNameEn || (student.middleName ? transliterateArabicToEnglish(student.middleName) : null),
    student.lastNameEn || transliterateArabicToEnglish(student.lastName)
  ].filter(Boolean).join(' ');
  
  // School names with transliteration
  const schoolNameAr = school.name;
  const schoolNameEn = school.nameEn || transliterateArabicToEnglish(school.name);
  
  // Get transcript number and QR code from data
  const transcriptNumber = data.transcriptNumber || '';
  const qrCodeDataUrl = data.qrCodeDataUrl || '';
  
  // Nationality
  const nationalityAr = student.nationality || '';
  const nationalityEn = student.nationalityEn || translateNationality(nationalityAr);
  
  // Generate subject rows HTML (RTL order: م, المادة, الكبرى, الصغرى, المكتسبة)
  const subjectRowsHTML = subjectMarks.map((subject, index) => {
    const markDisplay = subject.mark !== null && subject.mark !== undefined ? subject.mark.toString() : '';
    return `
      <tr>
        <td class="num-cell">${index + 1}</td>
        <td class="subject-cell">${subject.arabicName}</td>
        <td class="score-cell">${subject.maxScore}</td>
        <td class="score-cell">${subject.minScore}</td>
        <td class="mark-cell">${markDisplay}</td>
      </tr>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', 'Tahoma', sans-serif;
      font-size: 12px;
      direction: rtl;
      text-align: right;
      background: white;
      padding: 15px;
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
      width: 350px;
      height: 350px;
    }
    .watermark img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #333;
    }
    .header-table td {
      border: none;
      padding: 5px 10px;
      vertical-align: middle;
    }
    .header-left {
      text-align: left;
      direction: ltr;
      width: 30%;
      font-size: 13px;
      line-height: 1.6;
    }
    .header-center {
      text-align: center;
      width: 25%;
      padding: 10px;
    }
    .header-logo {
      max-width: 90px;
      height: auto;
      margin: 0 auto;
      display: block;
    }
    .header-right {
      text-align: right;
      direction: rtl;
      width: 30%;
      font-size: 13px;
      line-height: 1.6;
    }
    .header-left strong,
    .header-right strong {
      display: block;
      font-weight: bold;
      margin-bottom: 3px;
      font-size: 13px;
    }
    .header-left div,
    .header-right div {
      margin: 2px 0;
    }
    .main-title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      color: #000;
      margin: 10px 0;
      direction: rtl;
      line-height: 1.4;
    }
    .title {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 20px 0;
      color: #1a5276;
    }
    .identity-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      padding: 8px;
      background: #f9f9f9;
      border: 1px solid #ddd;
    }
    .identity-ar {
      text-align: right;
      width: 48%;
      line-height: 2;
      font-size: 14px;
    }
    .identity-en {
      text-align: left;
      direction: ltr;
      width: 48%;
      line-height: 2;
      font-size: 14px;
    }
    .identity-label {
      font-weight: bold;
    }
    .identity-value {
      color: #1a5276;
    }
    table.marks-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    table.marks-table th,
    table.marks-table td {
      border: 1px solid #333;
      padding: 6px 4px;
      text-align: center;
    }
    table.marks-table th {
      background: #e8e8e8;
      font-weight: bold;
      font-size: 11px;
    }
    .num-cell { width: 8%; text-align: center; }
    .subject-cell { width: 35%; text-align: right !important; padding-right: 12px; font-weight: bold; }
    .subject-header { text-align: right !important; padding-right: 12px; }
    .score-cell { width: 12%; text-align: center; }
    .mark-cell { width: 15%; font-weight: bold; color: #1a5276; text-align: center; }
    .summary-row td {
      background: #f5f5f5;
      font-weight: bold;
    }
    .total-row td {
      background: #e8e8e8;
      font-size: 13px;
    }
    .grade-row td {
      background: #d4edda;
      font-size: 14px;
      color: #155724;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 15px;
      padding-top: 10px;
    }
    .signature-block {
      text-align: center;
      width: 45%;
    }
    .signature-label {
      font-weight: bold;
      margin-bottom: 15px;
    }
    .signature-line {
      width: 180px;
      margin: 0 auto;
      font-size: 10px;
      letter-spacing: 1px;
      color: #555;
    }
    .qr-section {
      margin-top: 10px;
      padding: 8px;
      border-top: 1px solid #ddd;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .qr-text {
      text-align: right;
      direction: rtl;
      flex: 1;
    }
    .qr-text div {
      font-size: 9px;
      color: #666;
      margin-bottom: 2px;
    }
    .qr-code-container {
      text-align: center;
    }
    .qr-code-container img {
      width: 85px;
      height: 85px;
      border: 1px solid #ddd;
      padding: 3px;
    }
    .qr-code-container .transcript-num {
      font-size: 8px;
      color: #666;
      margin-top: 3px;
    }
  </style>
</head>
<body>
  ${watermarkDataUrl ? `<div class="watermark"><img src="${watermarkDataUrl}" alt="Watermark"></div>` : ''}
  <div class="container">
    <table class="header-table">
      <tr>
        <td class="header-left">
          <strong>الأمانة العامة للتعليم الإسلامي العربي</strong>
          <div>في غامبيا</div>
          <div style="margin-top: 5px;">قسم الامتحانات</div>
        </td>
        <td class="header-center">
          <img src="${logoDataUrl}" alt="Logo" class="header-logo">
        </td>
        <td class="header-right">
          <strong>The General Secretariat for</strong>
          <div>Islamic/Arabic Education in</div>
          <div>The Gambia</div>
          <div style="margin-top: 5px;">Examination affairs unit</div>
        </td>
      </tr>
    </table>

    <div class="main-title">كشف نتائج الامتحانات للشهادة الابتدائية للعام ${examYear.year - 1}-${examYear.year} م</div>
    
    ${transcriptNumber ? `<div style="text-align: center; margin-bottom: 15px; font-size: 12px; color: #555;">
      <span style="font-weight: bold;">Transcript No. / رقم الكشف:</span> ${transcriptNumber}
    </div>` : ''}

    <div class="identity-section">
      <div class="identity-ar">
        <div><span class="identity-label">اسم الطالب/ة:</span> <span class="identity-value">${fullNameAr}</span></div>
        <div><span class="identity-label">الجنسية:</span> <span class="identity-value">${nationalityAr}</span></div>
        <div><span class="identity-label">المدرسة:</span> <span class="identity-value">${schoolNameAr}</span></div>
      </div>
      <div class="identity-en">
        <div><span class="identity-label">Student Name:</span> <span class="identity-value">${fullNameEn}</span></div>
        <div><span class="identity-label">Nationality:</span> <span class="identity-value">${nationalityEn}</span></div>
        <div><span class="identity-label">School:</span> <span class="identity-value">${schoolNameEn}</span></div>
      </div>
    </div>

    <table class="marks-table">
      <thead>
        <tr>
          <th class="num-cell">م</th>
          <th class="subject-header">المادة</th>
          <th class="score-cell">الدرجات<br>الكبرى</th>
          <th class="score-cell">الدرجات<br>الصغرى</th>
          <th class="mark-cell">الدرجة المكتسبة<br>رقماً</th>
        </tr>
      </thead>
      <tbody>
        ${subjectRowsHTML}
        <tr class="summary-row total-row">
          <td colspan="3" style="text-align:center; font-size:14px;">مجموع الدرجات</td>
          <td colspan="2" style="text-align:center;">${totalMarks}</td>
        </tr>
        <tr class="summary-row">
          <td colspan="3" style="text-align:center;">النسبة</td>
          <td colspan="2" style="text-align:center;">${percentage.toFixed(1)}%</td>
        </tr>
        <tr class="summary-row grade-row">
          <td colspan="3" style="text-align:center;">التقدير</td>
          <td colspan="2" style="text-align:center; font-size:16px;">${finalGrade.arabic}</td>
        </tr>
      </tbody>
    </table>

    <div class="signatures">
      <div class="signature-block">
        <div class="signature-label">توقيع رئيس لجنة الامتحانات</div>
        <div class="signature-line">............................</div>
      </div>
      <div class="signature-block">
        <div class="signature-label">توقيع إدارة الأمانة</div>
        <div class="signature-line">............................</div>
      </div>
    </div>
    
    ${qrCodeDataUrl ? `
    <div class="qr-section">
      <div class="qr-text">
        <div>للتحقق من صحة هذا الكشف، امسح رمز QR</div>
        <div>To verify this transcript, scan the QR code</div>
      </div>
      <div class="qr-code-container">
        <img src="${qrCodeDataUrl}" alt="QR Code">
        <div class="transcript-num">${transcriptNumber}</div>
      </div>
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}

export async function generateTranscriptPDF(data: TranscriptData): Promise<string> {
  // Validate first
  const validation = validateTranscriptRequirements(data);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errorsAr.join(', ')}`);
  }

  const htmlContent = generateTranscriptHTML(data);

  const browser = await puppeteer.launch({
    headless: 'new' as any,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    
    const fileName = `transcript_g6_${data.student.indexNumber || data.student.id}_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, fileName);
    
    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });
    
    return filePath;
  } catch (error) {
    console.error(`Transcript PDF generation error for student ${data.student.id}:`, error);
    throw error;
  } finally {
    await browser.close();
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
