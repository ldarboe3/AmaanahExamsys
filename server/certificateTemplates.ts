export interface FieldPosition {
  x: number;
  y: number;
  fontSize: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  maxWidth?: number;
}

export interface QRPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplateConfig {
  fields: {
    candidateNameAr: FieldPosition;
    birthPlaceAr: FieldPosition;
    dobGreg: FieldPosition;
    schoolNameAr: FieldPosition;
    examWindowTextAr: FieldPosition;
    finalGradeWordAr: FieldPosition;
    certificateNumber: FieldPosition;
    issueDateHijri: FieldPosition;
    issueDateGreg: FieldPosition;
  };
  qr: QRPosition;
}

export interface GradeTemplates {
  male: TemplateConfig;
  female: TemplateConfig;
}

const maleTemplateConfig: TemplateConfig = {
  fields: {
    candidateNameAr: { x: 520, y: 392, fontSize: 20, fontWeight: 'bold', textAlign: 'right', maxWidth: 300 },
    birthPlaceAr: { x: 450, y: 437, fontSize: 16, textAlign: 'right', maxWidth: 120 },
    dobGreg: { x: 318, y: 437, fontSize: 16, textAlign: 'center' },
    schoolNameAr: { x: 550, y: 466, fontSize: 16, textAlign: 'right', maxWidth: 350 },
    examWindowTextAr: { x: 450, y: 522, fontSize: 16, textAlign: 'right' },
    finalGradeWordAr: { x: 250, y: 522, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    certificateNumber: { x: 420, y: 570, fontSize: 14, textAlign: 'center' },
    issueDateHijri: { x: 340, y: 570, fontSize: 14, textAlign: 'center' },
    issueDateGreg: { x: 220, y: 570, fontSize: 14, textAlign: 'center' },
  },
  qr: { x: 70, y: 630, width: 80, height: 80 }
};

const femaleTemplateConfig: TemplateConfig = {
  fields: {
    candidateNameAr: { x: 520, y: 392, fontSize: 20, fontWeight: 'bold', textAlign: 'right', maxWidth: 300 },
    birthPlaceAr: { x: 450, y: 437, fontSize: 16, textAlign: 'right', maxWidth: 120 },
    dobGreg: { x: 318, y: 437, fontSize: 16, textAlign: 'center' },
    schoolNameAr: { x: 550, y: 466, fontSize: 16, textAlign: 'right', maxWidth: 350 },
    examWindowTextAr: { x: 450, y: 522, fontSize: 16, textAlign: 'right' },
    finalGradeWordAr: { x: 250, y: 522, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    certificateNumber: { x: 420, y: 570, fontSize: 14, textAlign: 'center' },
    issueDateHijri: { x: 340, y: 570, fontSize: 14, textAlign: 'center' },
    issueDateGreg: { x: 220, y: 570, fontSize: 14, textAlign: 'center' },
  },
  qr: { x: 70, y: 630, width: 80, height: 80 }
};

export const certificateTemplates: Record<number, GradeTemplates> = {
  3: { male: maleTemplateConfig, female: femaleTemplateConfig },
  6: { male: maleTemplateConfig, female: femaleTemplateConfig },
  9: { male: maleTemplateConfig, female: femaleTemplateConfig },
  12: { male: maleTemplateConfig, female: femaleTemplateConfig },
};

// Get certificate template for any grade - uses a default template for unsupported grades
export function getCertificateTemplate(grade: number, gender: 'male' | 'female'): TemplateConfig {
  const gradeTemplates = certificateTemplates[grade];
  if (gradeTemplates) {
    return gradeTemplates[gender];
  }
  // Default to grade 6 template for unsupported grades
  return certificateTemplates[6][gender];
}

// Grade level names in Arabic for certificates (all grades 1-12)
export const gradeLevelNamesArabic: Record<number, string> = {
  1: 'المرحلة الابتدائية الدنيا',
  2: 'المرحلة الابتدائية الدنيا',
  3: 'المرحلة الابتدائية الدنيا',
  4: 'المرحلة الابتدائية العليا',
  5: 'المرحلة الابتدائية العليا',
  6: 'المرحلة الابتدائية العليا',
  7: 'المرحلة الإعدادية',
  8: 'المرحلة الإعدادية',
  9: 'المرحلة الإعدادية',
  10: 'المرحلة الثانوية',
  11: 'المرحلة الثانوية',
  12: 'المرحلة الثانوية',
};

// Grade level names in English for certificates (all grades 1-12)
export const gradeLevelNamesEnglish: Record<number, string> = {
  1: 'Lower Basic',
  2: 'Lower Basic',
  3: 'Lower Basic',
  4: 'Upper Basic',
  5: 'Upper Basic',
  6: 'Upper Basic',
  7: 'Basic Cycle',
  8: 'Basic Cycle',
  9: 'Basic Cycle',
  10: 'Senior Secondary',
  11: 'Senior Secondary',
  12: 'Senior Secondary',
};

// Get Arabic grade level name with fallback
export function getGradeLevelNameArabic(grade: number): string {
  return gradeLevelNamesArabic[grade] || `الصف ${grade}`;
}

// Get English grade level name with fallback
export function getGradeLevelNameEnglish(grade: number): string {
  return gradeLevelNamesEnglish[grade] || `Grade ${grade}`;
}

export const arabicMonths: Record<number, string> = {
  1: 'يناير',
  2: 'فبراير', 
  3: 'مارس',
  4: 'أبريل',
  5: 'مايو',
  6: 'يونيو',
  7: 'يوليو',
  8: 'أغسطس',
  9: 'سبتمبر',
  10: 'أكتوبر',
  11: 'نوفمبر',
  12: 'ديسمبر',
};

export const gradeWords: Record<string, string> = {
  'A': 'ممتاز',
  'B': 'جيد جداً',
  'C': 'جيد',
  'D': 'مقبول',
  'E': 'ضعيف',
  'F': 'راسب',
  'PASS': 'ناجح',
  'FAIL': 'راسب',
};

export function getGradeWord(grade: string): string {
  return gradeWords[grade.toUpperCase()] || grade;
}

export function formatArabicDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day} / ${month} / ${year} م`;
}

export function toHijri(date: Date): { year: number; month: number; day: number } {
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianDay = date.getDate();
  
  let jd = Math.floor((1461 * (gregorianYear + 4800 + Math.floor((gregorianMonth - 14) / 12))) / 4) +
    Math.floor((367 * (gregorianMonth - 2 - 12 * Math.floor((gregorianMonth - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((gregorianYear + 4900 + Math.floor((gregorianMonth - 14) / 12)) / 100)) / 4) +
    gregorianDay - 32075;
  
  let l = jd - 1948440 + 10632;
  let n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  let j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  
  const hijriMonth = Math.floor((24 * l) / 709);
  const hijriDay = l - Math.floor((709 * hijriMonth) / 24);
  const hijriYear = 30 * n + j - 30;
  
  return { year: hijriYear, month: hijriMonth, day: hijriDay };
}

export function formatHijriDate(date: Date): string {
  const hijri = toHijri(date);
  const day = hijri.day.toString().padStart(2, '0');
  const month = hijri.month.toString().padStart(2, '0');
  return `${day} / ${month} / ${hijri.year} هـ`;
}

export function generateCertificateNumber(examYear: number, studentId: number): string {
  const yearPrefix = examYear.toString().slice(-2);
  const studentNumber = studentId.toString().padStart(8, '0');
  return `${yearPrefix}/${studentNumber}`;
}

export function generateQRToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
