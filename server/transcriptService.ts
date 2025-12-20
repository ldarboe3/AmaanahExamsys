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

// Note: Font files are corrupted/broken. Using Helvetica for reliable PDF generation.

export async function generateTranscriptPDF(data: TranscriptData): Promise<string> {
  const validation = validateTranscriptRequirements(data);
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errorsAr.join(', ')}`);
  }

  const { student, school, examYear, subjectMarks, totalMarks, percentage, finalGrade } = data;
  
  const fullNameAr = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
  const fullNameEn = [
    student.firstNameEn || transliterateArabicToEnglish(student.firstName),
    student.middleNameEn || (student.middleName ? transliterateArabicToEnglish(student.middleName) : null),
    student.lastNameEn || transliterateArabicToEnglish(student.lastName)
  ].filter(Boolean).join(' ');
  
  const schoolNameAr = school.name;
  const schoolNameEn = school.nameEn || transliterateArabicToEnglish(school.name);
  const nationalityAr = student.nationality || '';
  const nationalityEn = student.nationalityEn || translateNationality(nationalityAr);
  const transcriptNumber = data.transcriptNumber || '';
  
  return new Promise((resolve, reject) => {
    try {
      const fileName = `transcript_g6_${data.student.indexNumber || data.student.id}_${Date.now()}.pdf`;
      const filePath = path.join(outputDir, fileName);
      
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const stream = fs.createWriteStream(filePath);
      
      doc.pipe(stream);
      
      
      
      const pageWidth = doc.page.width - 80;
      const leftMargin = 40;
      const rightEdge = doc.page.width - 40;
      
      doc.fontSize(10).fillColor('#333333');
      doc.text('The General Secretariat for', leftMargin, 40);
      doc.text('Islamic/Arabic Education in The Gambia', leftMargin, 52);
      doc.text('Examination Affairs Unit', leftMargin, 64);
      
      const logoPath = path.join(process.cwd(), 'generated_transcripts', 'logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, (doc.page.width - 60) / 2, 35, { width: 60 });
      }
      
      
      doc.moveTo(leftMargin, 95).lineTo(rightEdge, 95).stroke('#333333');
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000');
      doc.text(`Primary Certificate Results ${examYear.year - 1}-${examYear.year}`, leftMargin, 105, { width: pageWidth, align: 'center' });
      
      if (transcriptNumber) {
        doc.font('Helvetica').fontSize(10).fillColor('#555555');
        doc.text(`Transcript No. / Transcript No.: ${transcriptNumber}`, leftMargin, 125, { width: pageWidth, align: 'center' });
      }
      
      let yPos = 145;
      doc.rect(leftMargin, yPos, pageWidth, 65).fill('#f9f9f9').stroke('#dddddd');
      
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
      doc.text('Student Name:', leftMargin + 10, yPos + 8);
      doc.text('Nationality:', leftMargin + 10, yPos + 25);
      doc.text('School:', leftMargin + 10, yPos + 42);
      
      doc.font('Helvetica').fillColor('#1a5276');
      doc.text(fullNameEn, leftMargin + 100, yPos + 8);
      doc.text(nationalityEn, leftMargin + 100, yPos + 25);
      doc.text(schoolNameEn, leftMargin + 100, yPos + 42);
      
      yPos = 220;
      const colWidths = [30, 180, 60, 60, 80];
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);
      const tableX = (doc.page.width - tableWidth) / 2;
      
      doc.rect(tableX, yPos, tableWidth, 25).fill('#e8e8e8').stroke('#333333');
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9);
      
      let xPos = tableX;
      doc.text('#', xPos, yPos + 8, { width: colWidths[0], align: 'center' });
      xPos += colWidths[0];
      doc.text('Subject', xPos, yPos + 8, { width: colWidths[1], align: 'center' });
      xPos += colWidths[1];
      doc.text('Max', xPos, yPos + 8, { width: colWidths[2], align: 'center' });
      xPos += colWidths[2];
      doc.text('Min', xPos, yPos + 8, { width: colWidths[3], align: 'center' });
      xPos += colWidths[3];
      doc.text('Score', xPos, yPos + 8, { width: colWidths[4], align: 'center' });
      
      yPos += 25;
      
      subjectMarks.forEach((subject, index) => {
        const rowColor = index % 2 === 0 ? '#ffffff' : '#f5f5f5';
        doc.rect(tableX, yPos, tableWidth, 20).fill(rowColor).stroke('#333333');
        
        doc.fillColor('#000000').font('Helvetica').fontSize(9);
        xPos = tableX;
        doc.text((index + 1).toString(), xPos, yPos + 6, { width: colWidths[0], align: 'center' });
        xPos += colWidths[0];
        
        const displayName = hasArabicFont ? `${subject.englishName} / ${shapeArabicText(subject.arabicName)}` : subject.englishName;
        doc.text(displayName, xPos + 5, yPos + 6, { width: colWidths[1] - 10 });
        xPos += colWidths[1];
        
        doc.text(subject.maxScore.toString(), xPos, yPos + 6, { width: colWidths[2], align: 'center' });
        xPos += colWidths[2];
        doc.text(subject.minScore.toString(), xPos, yPos + 6, { width: colWidths[3], align: 'center' });
        xPos += colWidths[3];
        
        const markText = subject.mark !== null && subject.mark !== undefined ? subject.mark.toString() : '-';
        doc.font('Helvetica-Bold').fillColor('#1a5276');
        doc.text(markText, xPos, yPos + 6, { width: colWidths[4], align: 'center' });
        
        yPos += 20;
      });
      
      doc.rect(tableX, yPos, tableWidth, 22).fill('#e8e8e8').stroke('#333333');
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
      doc.text('Total / ' + (false ? shapeArabicText('مجموع الدرجات') : 'Total'), tableX + 5, yPos + 6, { width: colWidths[0] + colWidths[1] + colWidths[2] });
      doc.text(totalMarks.toString(), tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos + 6, { width: colWidths[4], align: 'center' });
      yPos += 22;
      
      doc.rect(tableX, yPos, tableWidth, 22).fill('#f5f5f5').stroke('#333333');
      doc.text('Percentage / ' + (false ? shapeArabicText('النسبة') : 'Percentage'), tableX + 5, yPos + 6, { width: colWidths[0] + colWidths[1] + colWidths[2] });
      doc.text(`${percentage.toFixed(1)}%`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos + 6, { width: colWidths[4], align: 'center' });
      yPos += 22;
      
      doc.rect(tableX, yPos, tableWidth, 25).fill('#d4edda').stroke('#333333');
      doc.fillColor('#155724').fontSize(11);
      doc.text('Grade / ' + (false ? shapeArabicText('التقدير') : 'Grade'), tableX + 5, yPos + 7, { width: colWidths[0] + colWidths[1] + colWidths[2] });
      const gradeText = hasArabicFont ? `${finalGrade.english} / ${shapeArabicText(finalGrade.arabic)}` : finalGrade.english;
      doc.text(gradeText, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], yPos + 7, { width: colWidths[4], align: 'center' });
      yPos += 40;
      
      doc.fillColor('#000000').font('Helvetica-Bold').fontSize(10);
      doc.text('Exam Committee Chairman', leftMargin + 30, yPos);
      doc.text('Secretariat Administration', rightEdge - 180, yPos);
      
      yPos += 35;
      doc.font('Helvetica').fontSize(8).fillColor('#666666');
      doc.moveTo(leftMargin + 30, yPos).lineTo(leftMargin + 150, yPos).stroke('#999999');
      doc.moveTo(rightEdge - 180, yPos).lineTo(rightEdge - 60, yPos).stroke('#999999');
      
      if (data.qrCodeDataUrl) {
        yPos += 20;
        doc.moveTo(leftMargin, yPos).lineTo(rightEdge, yPos).stroke('#dddddd');
        yPos += 10;
        
        doc.fontSize(8).fillColor('#666666');
        doc.text('To verify this transcript, scan the QR code', leftMargin, yPos);
        
        const qrBuffer = Buffer.from(data.qrCodeDataUrl.split(',')[1], 'base64');
        doc.image(qrBuffer, leftMargin, yPos + 15, { width: 70 });
        
        doc.font('Helvetica').fontSize(7);
        doc.text(transcriptNumber, leftMargin, yPos + 90, { width: 70, align: 'center' });
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
