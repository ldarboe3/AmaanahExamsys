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
// Matches EXACTLY the reference screenshot layout
function generateTranscriptHTML(data: TranscriptData, logoBase64: string, qrCodeDataUrl: string): string {
  const { student, school, examYear, subjectMarks, totalMarks, percentage, finalGrade } = data;
  
  const fullNameAr = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
  const nationalityAr = student.nationality || 'غامبي';
  const schoolNameAr = school.name;
  const transcriptNumber = data.transcriptNumber || '';
  
  // Build subject rows - RTL table with columns: م | المادة | الدرجات الكبرى | الدرجات الصغرى | الدرجة المحققة
  const subjectRows = subjectMarks.map((subject, index) => {
    const markValue = subject.mark !== null && subject.mark !== undefined ? subject.mark : '-';
    const hasYellowHighlight = typeof subject.mark === 'number' && subject.mark >= 50;
    return `
    <tr>
      <td class="col-index">${index + 1}</td>
      <td class="col-subject">${subject.arabicName}</td>
      <td class="col-max">${subject.maxScore}</td>
      <td class="col-min">${subject.minScore}</td>
      <td class="col-score ${hasYellowHighlight ? 'highlight' : ''}">${markValue}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 0; }
    
    html, body {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      font-family: 'Amiri', serif;
      background: white;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .page {
      width: 210mm;
      height: 297mm;
      padding: 8mm 12mm 38mm 12mm;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    
    /* Watermark - behind everything, NO background on table cells */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.10;
      z-index: 0;
      pointer-events: none;
    }
    .watermark img {
      width: 110mm;
    }
    
    .content {
      position: relative;
      z-index: 1;
      flex: 1;
    }
    
    /* HEADER - English LEFT, Logo CENTER, Arabic RIGHT */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 3mm;
      direction: ltr;
    }
    
    .header-english {
      width: 55mm;
      font-family: 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.5;
      text-align: left;
    }
    
    .header-logo {
      width: 28mm;
      text-align: center;
    }
    .header-logo img {
      width: 24mm;
      height: 24mm;
    }
    
    .header-arabic {
      width: 60mm;
      font-size: 12pt;
      font-weight: bold;
      line-height: 1.6;
      text-align: right;
      direction: rtl;
    }
    
    /* Header separator */
    .header-line {
      border-top: 1px solid #333;
      margin: 2mm 0 4mm 0;
    }
    
    /* TITLE - Arabic centered */
    .main-title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 2mm;
      direction: rtl;
    }
    
    /* Transcript number */
    .transcript-number {
      text-align: center;
      font-size: 11pt;
      margin-bottom: 3mm;
      direction: rtl;
    }
    
    /* STUDENT INFO BOX - transparent for watermark */
    .student-box {
      border: 1px solid #ccc;
      padding: 2mm 4mm;
      margin-bottom: 3mm;
      display: flex;
      justify-content: space-between;
      direction: ltr;
    }
    
    .student-left {
      text-align: left;
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
    }
    .student-left .label { font-weight: bold; }
    .student-left .value { color: #1a5276; font-weight: bold; }
    
    .student-right {
      text-align: right;
      font-size: 13pt;
      line-height: 1.6;
      direction: rtl;
    }
    .student-right .label { font-weight: bold; }
    .student-right .value { color: #1a5276; font-weight: bold; }
    
    /* MARKS TABLE - NO BACKGROUND COLORS for watermark visibility */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
      direction: rtl;
      background: transparent;
    }
    
    table th {
      padding: 1.5mm 1mm;
      border: 1px solid #999;
      font-size: 10pt;
      font-weight: bold;
      text-align: center;
    }
    
    table td {
      padding: 1mm 1mm;
      border: 1px solid #bbb;
      font-size: 10pt;
      text-align: center;
    }
    
    .col-index { width: 8mm; }
    .col-subject { width: auto; text-align: right; padding-right: 2mm !important; font-weight: bold; font-size: 10pt; }
    .col-max { width: 20mm; }
    .col-min { width: 20mm; }
    .col-score { width: 22mm; font-weight: bold; }
    
    /* Summary rows - no backgrounds */
    .summary-row td { font-weight: bold; border-top: 2px solid #999; }
    .summary-label { text-align: right !important; padding-right: 2mm !important; }
    .summary-value { text-align: center; font-weight: bold; font-size: 11pt; }
    .percentage-row td { font-weight: bold; }
    .grade-row td { color: #155724; font-weight: bold; font-size: 11pt; }
    
    /* SIGNATURE SECTION - above the footer separator */
    .signature-section {
      margin-top: 6mm;
      display: flex;
      justify-content: space-around;
      direction: rtl;
    }
    
    .sig-block {
      text-align: center;
    }
    
    .sig-label {
      font-size: 11pt;
      direction: rtl;
      margin-bottom: 8mm;
    }
    
    .sig-line {
      border-top: 1px solid #666;
      width: 50mm;
      margin: 0 auto;
    }
    
    /* FOOTER - fixed at bottom with gray background */
    .footer {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
    }
    .footer-bar {
      background: #f2f2f2;
      padding: 4mm 12mm 3mm;
      border-top: 1px solid #d0d0d0;
    }
    .footer-content {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8mm;
      direction: ltr;
    }
    .footer-left {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 1mm;
    }
    .qr-frame {
      width: 22mm;
      height: 22mm;
      border: 1px solid #c8c8c8;
      padding: 1mm;
      background: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .qr-frame img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .transcript-code {
      font-family: 'Times New Roman', serif;
      font-size: 8pt;
      letter-spacing: 0.3pt;
      color: #333;
    }
    .footer-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1.5mm;
      text-align: right;
      direction: rtl;
    }
    .verify-ar {
      font-size: 9pt;
      color: #222;
    }
    .verify-en {
      font-family: 'Times New Roman', serif;
      font-size: 8pt;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Watermark -->
    <div class="watermark">
      <img src="data:image/png;base64,${logoBase64}" alt="">
    </div>
    
    <div class="content">
      <!-- HEADER -->
      <div class="header">
        <div class="header-english">
          The General Secretariat for<br>
          Islamic/Arabic Education in<br>
          The Gambia<br>
          Examination affairs unit
        </div>
        <div class="header-logo">
          <img src="data:image/png;base64,${logoBase64}" alt="">
        </div>
        <div class="header-arabic">
          الأمانة العامة للتعليم الإسلامي العربي<br>
          في غامبيا<br>
          قسم الامتحانات
        </div>
      </div>
      
      <div class="header-line"></div>
      
      <!-- TITLE -->
      <div class="main-title">
        كشف نتائج الامتحانات للشهادة الابتدائية للعام ${examYear.year - 1}-${examYear.year} م
      </div>
      
      <div class="transcript-number">
        Transcript No. / رقم الكشف: ${transcriptNumber}
      </div>
      
      <!-- STUDENT INFO -->
      <div class="student-box">
        <div class="student-left">
          <div><span class="label">Student Name:</span> <span class="value">${transliterateArabicToEnglish(fullNameAr)}</span></div>
          <div><span class="label">Nationality:</span> <span class="value">Gambian</span></div>
          <div><span class="label">School:</span> <span class="value">${transliterateArabicToEnglish(schoolNameAr)}</span></div>
        </div>
        <div class="student-right">
          <div><span class="label">اسم الطالب/ة:</span> <span class="value">${fullNameAr}</span></div>
          <div><span class="label">الجنسية:</span> <span class="value">${nationalityAr}</span></div>
          <div><span class="label">المدرسة:</span> <span class="value">${schoolNameAr}</span></div>
        </div>
      </div>
      
      <!-- MARKS TABLE -->
      <table>
        <thead>
          <tr>
            <th class="col-index">م</th>
            <th class="col-subject">المادة</th>
            <th class="col-max">الدرجات الكبرى</th>
            <th class="col-min">الدرجات الصغرى</th>
            <th class="col-score">الدرجة المحققة</th>
          </tr>
        </thead>
        <tbody>
          ${subjectRows}
          <tr class="summary-row">
            <td colspan="4" class="summary-label">مجموع الدرجات</td>
            <td class="summary-value">${totalMarks}</td>
          </tr>
          <tr class="percentage-row">
            <td colspan="4" class="summary-label">النسبة</td>
            <td class="summary-value">${percentage.toFixed(1)}%</td>
          </tr>
          <tr class="grade-row">
            <td colspan="4" class="summary-label">التقدير</td>
            <td class="summary-value">${finalGrade.arabic}</td>
          </tr>
        </tbody>
      </table>
      
      <!-- SIGNATURE SECTION -->
      <div class="signature-section">
        <div class="sig-block">
          <div class="sig-label">توقيع رئيس لجنة الامتحانات</div>
          <div class="sig-line"></div>
        </div>
        <div class="sig-block">
          <div class="sig-label">توقيع إدارة الأمانة</div>
          <div class="sig-line"></div>
        </div>
      </div>
    </div>
    
    <!-- FOOTER with QR, color bar, and verification text -->
    <footer class="footer">
      <div class="footer-bar">
        <div class="footer-content">
          <div class="footer-left">
            <div class="qr-frame"><img src="${qrCodeDataUrl}" alt="QR"></div>
            <div class="transcript-code">${transcriptNumber}</div>
          </div>
          <div class="footer-right">
            <p class="verify-ar">للتحقق من صحة هذا الكشف، امسح رمز QR</p>
            <p class="verify-en">To verify this transcript, scan the QR code</p>
          </div>
        </div>
      </div>
    </footer>
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
  const verifyUrl = `https://amaanah.gm/verify/${data.transcriptNumber || 'preview'}`;
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
