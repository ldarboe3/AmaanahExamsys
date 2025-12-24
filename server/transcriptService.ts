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
  const fullNameEn = student.firstNameEn || transliterateArabicToEnglish(fullNameAr);
  
  const schoolNameAr = school.name;
  const schoolNameEn = school.nameEn || transliterateArabicToEnglish(school.name);
  const nationalityAr = student.nationality || '';
  const nationalityEn = student.nationalityEn || translateNationality(nationalityAr);
  const transcriptNumber = data.transcriptNumber || '';
  
  return new Promise((resolve, reject) => {
    try {
      const fileName = `transcript_g6_${data.student.indexNumber || data.student.id}_${Date.now()}.pdf`;
      const filePath = path.join(outputDir, fileName);
      
      const doc = new PDFDocument({ size: 'A4', margin: 30 });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);
      
      const margin = 30;
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - (margin * 2);
      const centerX = pageWidth / 2;
      
      // HEADER WITH LOGO AND TEXT
      const logoPath = path.join(process.cwd(), 'generated_transcripts', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, centerX - 35, 25, { width: 70 });
      }
      
      // English header on left
      doc.font('Helvetica').fontSize(9).fillColor('#333333');
      doc.text('The General Secretariat for', margin, 28);
      doc.text('Islamic/Arabic Education in', margin, 38);
      doc.text('The Gambia', margin, 48);
      doc.fontSize(8).text('Examination affairs unit', margin, 58);
      
      // Arabic header on right
      doc.fontSize(9).fillColor('#333333');
      doc.text(shapeArabicText('الأمانة العامة للتعليم الإسلامي'), pageWidth - margin - 180, 28, { width: 180, align: 'right' });
      doc.text(shapeArabicText('والعربي'), pageWidth - margin - 180, 38, { width: 180, align: 'right' });
      doc.text(shapeArabicText('في غامبيا'), pageWidth - margin - 180, 48, { width: 180, align: 'right' });
      doc.fontSize(8).text(shapeArabicText('قسم الامتحانات'), pageWidth - margin - 180, 58, { width: 180, align: 'right' });
      
      // Separator line
      let yPos = 75;
      doc.moveTo(margin, yPos).lineTo(pageWidth - margin, yPos).stroke('#333333');
      
      // Main title
      yPos += 15;
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
      doc.text(shapeArabicText('كشف نتائج الامتحانات للشهادة الابتدائية للعام 2025-2024 م'), margin, yPos, { width: contentWidth, align: 'center' });
      
      yPos += 18;
      doc.font('Helvetica').fontSize(9).fillColor('#333333');
      doc.text(`Transcript No. / رقم الكشف: ${transcriptNumber}`, margin, yPos, { width: contentWidth, align: 'center' });
      
      // Student details box
      yPos += 18;
      doc.rect(margin, yPos, contentWidth, 50).fill('#ffffff').stroke('#cccccc');
      
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
      doc.text('Student Name:', margin + 8, yPos + 6);
      doc.text('Nationality:', margin + 8, yPos + 20);
      doc.text('School:', margin + 8, yPos + 34);
      
      doc.font('Helvetica').fontSize(9).fillColor('#1a5276');
      doc.text(fullNameEn, margin + 110, yPos + 6);
      doc.text(nationalityEn, margin + 110, yPos + 20);
      doc.text(schoolNameEn, margin + 110, yPos + 34);
      
      // Arabic details on right
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
      doc.text(shapeArabicText('اسم الطالب:'), pageWidth - margin - 70, yPos + 6);
      doc.text(shapeArabicText('الجنسية:'), pageWidth - margin - 70, yPos + 20);
      doc.text(shapeArabicText('المدرسة:'), pageWidth - margin - 70, yPos + 34);
      
      doc.font('Helvetica').fontSize(9).fillColor('#1a5276');
      doc.text(shapeArabicText(fullNameAr), pageWidth - margin - 200, yPos + 6);
      doc.text(shapeArabicText(nationalityAr), pageWidth - margin - 200, yPos + 20);
      doc.text(shapeArabicText(schoolNameAr), pageWidth - margin - 200, yPos + 34);
      
      // TABLE
      yPos += 60;
      const tableMargin = margin + 10;
      const tableContentWidth = contentWidth - 20;
      
      // Table header
      const headerHeight = 16;
      doc.rect(tableMargin, yPos, tableContentWidth, headerHeight).fill('#cccccc').stroke('#000000');
      
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
      const col1 = tableMargin + 10;
      const col2 = tableMargin + 35;
      const col3 = tableMargin + 200;
      const col4 = tableMargin + 240;
      const col5 = tableMargin + 280;
      
      doc.text('م', col1, yPos + 3);
      doc.text(shapeArabicText('المادة'), col2 + 40, yPos + 3);
      doc.text(shapeArabicText('الدرجات الكبرى'), col3 + 10, yPos + 3);
      doc.text(shapeArabicText('الدرجات الصغرى'), col4, yPos + 3);
      doc.text(shapeArabicText('الدرجة المحققة'), col5 + 15, yPos + 3);
      
      yPos += headerHeight;
      
      // Table rows
      const rowHeight = 16;
      subjectMarks.forEach((subject, index) => {
        const rowColor = index % 2 === 0 ? '#ffffff' : '#f5f5f5';
        doc.rect(tableMargin, yPos, tableContentWidth, rowHeight).fill(rowColor).stroke('#999999');
        
        doc.font('Helvetica').fontSize(8).fillColor('#000000');
        doc.text((index + 1).toString(), col1, yPos + 3);
        doc.text(shapeArabicText(subject.arabicName), col2 + 50, yPos + 3);
        doc.text(subject.maxScore.toString(), col3 + 15, yPos + 3);
        doc.text(subject.minScore.toString(), col4 + 5, yPos + 3);
        
        const markText = subject.mark !== null && subject.mark !== undefined ? subject.mark.toString() : '-';
        doc.font('Helvetica-Bold').fillColor('#1a5276');
        doc.text(markText, col5 + 25, yPos + 3);
        
        yPos += rowHeight;
      });
      
      // Total row
      doc.rect(tableMargin, yPos, tableContentWidth, rowHeight).fill('#cccccc').stroke('#000000');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
      doc.text(shapeArabicText('مجموع الدرجات'), col2, yPos + 3);
      doc.text(totalMarks.toString(), col5 + 25, yPos + 3);
      yPos += rowHeight;
      
      // Percentage row
      doc.rect(tableMargin, yPos, tableContentWidth, rowHeight).fill('#f5f5f5').stroke('#999999');
      doc.font('Helvetica').fontSize(8).fillColor('#000000');
      doc.text(shapeArabicText('النسبة'), col2, yPos + 3);
      doc.text(`${percentage.toFixed(1)}%`, col5 + 25, yPos + 3);
      yPos += rowHeight;
      
      // Grade row
      doc.rect(tableMargin, yPos, tableContentWidth, rowHeight).fill('#c8e6c9').stroke('#000000');
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#155724');
      doc.text(shapeArabicText('التقدير'), col2, yPos + 3);
      doc.text(shapeArabicText(finalGrade.arabic), col5 + 20, yPos + 3);
      
      // Signature section
      yPos += rowHeight + 30;
      doc.font('Helvetica').fontSize(8).fillColor('#333333');
      doc.text(shapeArabicText('توقيع رئيس اللجنة الامتحانية'), margin + 50, yPos);
      doc.text(shapeArabicText('موقع إدارة الأمانة'), pageWidth - margin - 150, yPos);
      
      yPos += 20;
      doc.moveTo(margin + 30, yPos).lineTo(margin + 140, yPos).stroke('#666666');
      doc.moveTo(pageWidth - margin - 170, yPos).lineTo(pageWidth - margin - 60, yPos).stroke('#666666');
      
      // QR Code
      if (data.qrCodeDataUrl) {
        yPos += 30;
        const qrBuffer = Buffer.from(data.qrCodeDataUrl.split(',')[1], 'base64');
        doc.image(qrBuffer, margin, yPos, { width: 60 });
        
        doc.font('Helvetica').fontSize(7).fillColor('#666666');
        doc.text(transcriptNumber, margin, yPos + 65, { width: 60, align: 'center' });
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
