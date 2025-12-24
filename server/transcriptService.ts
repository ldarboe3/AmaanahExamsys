import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import { shapeArabicText } from './arabicTextHelper';

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

// Note: Font files at /fonts/Amiri-Regular.ttf and /fonts/Amiri-Bold.ttf are corrupted (contain HTML).
// Using Helvetica for reliable English rendering.

export async function generateTranscriptPDF(data: TranscriptData): Promise<string> {
  const validation = validateTranscriptRequirements(data);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errorsAr.join(', ')}`);
  }

  const { student, school, examYear, subjectMarks, totalMarks, percentage, finalGrade } = data;
  
  const fullNameAr = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
  const schoolNameAr = school.name;
  const nationalityAr = student.nationality || '';
  const transcriptNumber = data.transcriptNumber || '';
  
  return new Promise((resolve, reject) => {
    try {
      const fileName = `transcript_g6_${data.student.indexNumber || data.student.id}_${Date.now()}.pdf`;
      const filePath = path.join(outputDir, fileName);
      
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);
      
      // Register Arabic fonts for proper text rendering
      const amiriRegularPath = path.join(process.cwd(), 'fonts', 'Amiri-Regular.ttf');
      const amiriBoldPath = path.join(process.cwd(), 'fonts', 'Amiri-Bold.ttf');
      
      if (fs.existsSync(amiriRegularPath) && fs.existsSync(amiriBoldPath)) {
        doc.registerFont('Amiri', amiriRegularPath);
        doc.registerFont('Amiri-Bold', amiriBoldPath);
      }
      
      const pageWidth = 595; // A4 width in points
      const pageHeight = 842; // A4 height in points
      const margin = 35;
      const contentWidth = pageWidth - (margin * 2);
      
      // 1. HEADER SECTION
      // Add logo centered
      const logoPath = path.join(process.cwd(), 'public', 'amaanah-logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, (pageWidth - 60) / 2, 15, { width: 60, height: 60 });
      }
      
      // Add watermark in center of page (behind content)
      doc.save();
      doc.opacity(0.08);
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, (pageWidth - 200) / 2, 300, { width: 200 });
      }
      doc.restore();
      
      // English text on left
      doc.font('Helvetica').fontSize(9).fillColor('#000000');
      doc.text('The General Secretariat for', margin, 22, { width: 150 });
      doc.font('Helvetica').fontSize(8.5).fillColor('#000000');
      doc.text('Islamic/Arabic Education in', margin, 34, { width: 150 });
      doc.font('Helvetica').fontSize(8.5).fillColor('#000000');
      doc.text('The Gambia', margin, 44, { width: 150 });
      doc.font('Helvetica').fontSize(8).fillColor('#000000');
      doc.text('Examination affairs unit', margin, 54, { width: 150 });
      
      // Arabic text on right
      doc.font('Amiri').fontSize(9).fillColor('#000000');
      doc.text(shapeArabicText('الأمانة العامة للتعليم الإسلامي والعربي'), pageWidth - margin - 150, 22, { width: 150, align: 'right' });
      doc.font('Amiri').fontSize(8).fillColor('#000000');
      doc.text(shapeArabicText('في غامبيا'), pageWidth - margin - 150, 36, { width: 150, align: 'right' });
      doc.font('Amiri').fontSize(8).text(shapeArabicText('قسم الامتحانات'), pageWidth - margin - 150, 46, { width: 150, align: 'right' });
      
      // Separator line below header
      let yPos = 75;
      doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke('#000000');
      
      // 2. MAIN TITLE
      yPos = 85;
      doc.font('Amiri-Bold').fontSize(11).fillColor('#000000');
      doc.text(shapeArabicText('كشف نتائج الامتحانات للشهادة الابتدائية للعام 2025-2024 م'), margin, yPos, { 
        width: contentWidth, 
        align: 'center' 
      });
      
      // 3. TRANSCRIPT NUMBER
      yPos = 105;
      doc.font('Helvetica').fontSize(9).fillColor('#000000');
      doc.text(`Transcript No. / رقم الكشف: ${transcriptNumber}`, margin, yPos, { 
        width: contentWidth, 
        align: 'center' 
      });
      
      // 4. STUDENT DETAILS BOX
      yPos = 122;
      const boxHeight = 48;
      doc.rect(margin, yPos, contentWidth, boxHeight).fill('#ffffff').stroke('#cccccc');
      
      // English labels and values on left
      doc.font('Helvetica').fontSize(9).fillColor('#000000');
      doc.text('Student Name:', margin + 6, yPos + 6, { width: 100 });
      doc.text('Nationality:', margin + 6, yPos + 22, { width: 100 });
      doc.text('School:', margin + 6, yPos + 38, { width: 100 });
      
      // English values
      doc.font('Helvetica').fontSize(9).fillColor('#1a5276');
      doc.text(transliterateArabicToEnglish(fullNameAr), margin + 110, yPos + 6, { width: 200 });
      doc.text(transliterateArabicToEnglish(nationalityAr), margin + 110, yPos + 22, { width: 200 });
      doc.text(transliterateArabicToEnglish(schoolNameAr), margin + 110, yPos + 38, { width: 200 });
      
      // Arabic labels and values on right
      doc.font('Amiri').fontSize(9).fillColor('#000000');
      doc.text(shapeArabicText('اسم الطالب/ة:'), pageWidth - margin - 80, yPos + 6, { width: 80, align: 'right' });
      doc.text(shapeArabicText('الجنسية:'), pageWidth - margin - 80, yPos + 22, { width: 80, align: 'right' });
      doc.text(shapeArabicText('المدرسة:'), pageWidth - margin - 80, yPos + 38, { width: 80, align: 'right' });
      
      // Arabic values
      doc.font('Amiri').fontSize(9).fillColor('#1a5276');
      doc.text(shapeArabicText(fullNameAr), pageWidth - margin - 210, yPos + 6, { width: 130, align: 'right' });
      doc.text(shapeArabicText(nationalityAr), pageWidth - margin - 210, yPos + 22, { width: 130, align: 'right' });
      doc.text(shapeArabicText(schoolNameAr), pageWidth - margin - 210, yPos + 38, { width: 130, align: 'right' });
      
      // 5. RESULTS TABLE - RTL Layout (columns from right: م, المادة, الكبرى, الصغرى, المحققة)
      yPos = 180;
      const tableX = margin;
      const colScore = 70;     // الدرجة المحققة (leftmost)
      const colMin = 65;       // الدرجات الصغرى
      const colMax = 65;       // الدرجات الكبرى
      const colSubject = 150;  // المادة
      const colNum = 35;       // م (rightmost)
      const rowHeight = 20;
      
      // Calculate column positions from RIGHT to LEFT
      const col5X = pageWidth - margin - colNum;           // م
      const col4X = col5X - colSubject;                    // المادة
      const col3X = col4X - colMax;                        // الكبرى
      const col2X = col3X - colMin;                        // الصغرى
      const col1X = margin;                                // المحققة
      
      // Table header
      doc.rect(tableX, yPos, contentWidth, rowHeight).fill('#d5d5d5').stroke('#000000');
      doc.font('Amiri').fontSize(9).fillColor('#000000');
      
      // RTL header columns
      doc.text(shapeArabicText('الدرجة المحققة'), col1X, yPos + 5, { width: colScore, align: 'center' });
      doc.text(shapeArabicText('الدرجات الصغرى'), col2X, yPos + 5, { width: colMin, align: 'center' });
      doc.text(shapeArabicText('الدرجات الكبرى'), col3X, yPos + 5, { width: colMax, align: 'center' });
      doc.text(shapeArabicText('المادة'), col4X, yPos + 5, { width: colSubject, align: 'center' });
      doc.text(shapeArabicText('م'), col5X, yPos + 5, { width: colNum, align: 'center' });
      
      yPos += rowHeight;
      
      // Table rows with subjects - RTL layout
      subjectMarks.forEach((subject, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f5f5f5';
        doc.rect(tableX, yPos, contentWidth, rowHeight).fill(bgColor).stroke('#cccccc');
        
        // Achieved mark (leftmost column)
        const markText = subject.mark !== null && subject.mark !== undefined ? subject.mark.toString() : '-';
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1a5276');
        doc.text(markText, col1X, yPos + 5, { width: colScore, align: 'center' });
        
        // Min score
        doc.font('Helvetica').fontSize(9).fillColor('#000000');
        doc.text(subject.minScore.toString(), col2X, yPos + 5, { width: colMin, align: 'center' });
        
        // Max score
        doc.text(subject.maxScore.toString(), col3X, yPos + 5, { width: colMax, align: 'center' });
        
        // Subject name (Arabic)
        doc.font('Amiri').fontSize(9).fillColor('#000000');
        doc.text(shapeArabicText(subject.arabicName), col4X, yPos + 5, { width: colSubject, align: 'center' });
        
        // Number (rightmost)
        doc.font('Helvetica').fontSize(9).fillColor('#000000');
        doc.text((index + 1).toString(), col5X, yPos + 5, { width: colNum, align: 'center' });
        
        yPos += rowHeight;
      });
      
      // Total row
      doc.rect(tableX, yPos, contentWidth, rowHeight).fill('#d5d5d5').stroke('#000000');
      doc.font('Amiri').fontSize(9).fillColor('#000000');
      doc.text(shapeArabicText('مجموع الدرجات'), col4X, yPos + 5, { width: colSubject, align: 'center' });
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
      doc.text(totalMarks.toString(), col1X, yPos + 5, { width: colScore, align: 'center' });
      yPos += rowHeight;
      
      // Percentage row
      doc.rect(tableX, yPos, contentWidth, rowHeight).fill('#f5f5f5').stroke('#cccccc');
      doc.font('Amiri').fontSize(9).fillColor('#000000');
      doc.text(shapeArabicText('النسبة'), col4X, yPos + 5, { width: colSubject, align: 'center' });
      doc.font('Helvetica').fontSize(9).fillColor('#000000');
      doc.text(`${percentage.toFixed(1)}%`, col1X, yPos + 5, { width: colScore, align: 'center' });
      yPos += rowHeight;
      
      // Grade row
      doc.rect(tableX, yPos, contentWidth, rowHeight).fill('#c8e6c9').stroke('#000000');
      doc.font('Amiri').fontSize(9).fillColor('#155724');
      doc.text(shapeArabicText('التقدير'), col4X, yPos + 5, { width: colSubject, align: 'center' });
      doc.font('Amiri-Bold').fontSize(10).fillColor('#155724');
      doc.text(shapeArabicText(finalGrade.arabic), col1X, yPos + 5, { width: colScore, align: 'center' });
      
      // 6. SIGNATURE SECTION
      yPos += rowHeight + 20;
      doc.font('Helvetica').fontSize(8).fillColor('#000000');
      doc.text('Exam Committee Chairman', margin + 30, yPos);
      doc.font('Amiri').text(shapeArabicText('توقيع رئيس لجنة الامتحانات'), margin + 30, yPos + 12);
      doc.font('Helvetica').text('Secretariat Administration', pageWidth - margin - 140, yPos);
      doc.font('Amiri').text(shapeArabicText('توقيع إدارة الأمانة'), pageWidth - margin - 140, yPos + 12);
      
      yPos += 32;
      doc.moveTo(margin + 10, yPos).lineTo(margin + 120, yPos).stroke('#999999');
      doc.moveTo(pageWidth - margin - 160, yPos).lineTo(pageWidth - margin - 30, yPos).stroke('#999999');
      
      // 7. QR CODE SECTION
      yPos += 25;
      if (data.qrCodeDataUrl) {
        doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke('#cccccc');
        yPos += 10;
        
        const qrBuffer = Buffer.from(data.qrCodeDataUrl.split(',')[1], 'base64');
        doc.image(qrBuffer, margin, yPos, { width: 55 });
        
        doc.font('Helvetica').fontSize(7).fillColor('#666666');
        doc.text(transcriptNumber, margin, yPos + 60, { width: 55, align: 'center' });
        
        // QR verification text on right
        doc.font('Amiri').fontSize(7).fillColor('#666666');
        doc.text(shapeArabicText('للتحقق من صحة هذه الشهادة استخدم رمز QR'), pageWidth - margin - 200, yPos + 20, { width: 200, align: 'right' });
        doc.font('Helvetica').fontSize(7).fillColor('#666666');
        doc.text('To verify this transcript, scan the QR code', pageWidth - margin - 200, yPos + 30, { width: 200, align: 'right' });
      }
      
      doc.end();
      
      stream.on('finish', () => {
        console.log(`[Transcript PDF] Successfully generated: ${filePath}`);
        resolve(filePath);
      });
      
      stream.on('error', (err) => {
        console.error(`[Transcript PDF] Stream error:`, err.message);
        reject(new Error(`Failed to generate transcript PDF: ${err.message}`));
      });
      
    } catch (error: any) {
      const studentInfo = `${data.student.firstName} ${data.student.lastName} (${data.student.indexNumber || 'unknown'})`;
      console.error(`[Transcript PDF] Generation error for student ${studentInfo}:`, error.message);
      reject(new Error(`Failed to generate transcript PDF: ${error.message}`));
    }
  });
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
