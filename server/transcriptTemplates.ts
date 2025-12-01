export interface TranscriptSubjectConfig {
  name: string;
  arabicName: string;
  maxScore: number;
  passingScore: number;
  order: number;
}

export interface GradeTranscriptConfig {
  gradeName: string;
  gradeNameArabic: string;
  certificateTitle: string;
  certificateTitleArabic: string;
  subjects: TranscriptSubjectConfig[];
}

export const gradeTranscriptConfigs: Record<number, GradeTranscriptConfig> = {
  3: {
    gradeName: "Grade 3 (LBS)",
    gradeNameArabic: "الصف الثالث (الابتدائي الأدنى)",
    certificateTitle: "Lower Basic School Transcript",
    certificateTitleArabic: "كشف درجات المرحلة الابتدائية الدنيا",
    subjects: [
      { name: "Holy Quran", arabicName: "القرآن الكريم", maxScore: 100, passingScore: 50, order: 1 },
      { name: "Hadith", arabicName: "الحديث", maxScore: 100, passingScore: 50, order: 2 },
      { name: "Tawheed", arabicName: "التوحيد", maxScore: 100, passingScore: 50, order: 3 },
      { name: "Fiqh", arabicName: "الفقه", maxScore: 100, passingScore: 50, order: 4 },
      { name: "Seerah", arabicName: "السيرة", maxScore: 100, passingScore: 50, order: 5 },
      { name: "Reading & Memorization", arabicName: "القراءة والمحفوظات", maxScore: 100, passingScore: 50, order: 6 },
      { name: "Writing (Dictation & Handwriting)", arabicName: "الكتابة (الإملاء والخط)", maxScore: 100, passingScore: 50, order: 7 },
      { name: "Composition", arabicName: "التعبير", maxScore: 100, passingScore: 50, order: 8 },
      { name: "Grammar", arabicName: "القواعد", maxScore: 100, passingScore: 50, order: 9 },
      { name: "Science", arabicName: "Science", maxScore: 100, passingScore: 50, order: 10 },
      { name: "Mathematics", arabicName: "Mathematics", maxScore: 100, passingScore: 50, order: 11 },
    ],
  },
  6: {
    gradeName: "Grade 6 (UBS)",
    gradeNameArabic: "الصف السادس (الابتدائي الأعلى)",
    certificateTitle: "Upper Basic School Transcript",
    certificateTitleArabic: "كشف درجات المرحلة الابتدائية العليا",
    subjects: [
      { name: "Holy Quran", arabicName: "القرآن الكريم", maxScore: 100, passingScore: 50, order: 1 },
      { name: "Hadith", arabicName: "الحديث", maxScore: 100, passingScore: 50, order: 2 },
      { name: "Tawheed", arabicName: "التوحيد", maxScore: 100, passingScore: 50, order: 3 },
      { name: "Fiqh", arabicName: "الفقه", maxScore: 100, passingScore: 50, order: 4 },
      { name: "Seerah", arabicName: "السيرة", maxScore: 100, passingScore: 50, order: 5 },
      { name: "Reading & Memorization", arabicName: "القراءة والمحفوظات", maxScore: 100, passingScore: 50, order: 6 },
      { name: "Writing (Dictation & Handwriting)", arabicName: "الكتابة (الإملاء والخط)", maxScore: 100, passingScore: 50, order: 7 },
      { name: "Composition", arabicName: "التعبير", maxScore: 100, passingScore: 50, order: 8 },
      { name: "Grammar", arabicName: "القواعد", maxScore: 100, passingScore: 50, order: 9 },
      { name: "Science", arabicName: "Science", maxScore: 100, passingScore: 50, order: 10 },
      { name: "Mathematics", arabicName: "Mathematics", maxScore: 100, passingScore: 50, order: 11 },
      { name: "S.E.S", arabicName: "S.E.S", maxScore: 100, passingScore: 50, order: 12 },
      { name: "English", arabicName: "English", maxScore: 100, passingScore: 50, order: 13 },
    ],
  },
  9: {
    gradeName: "Grade 9 (BCS)",
    gradeNameArabic: "الصف التاسع (الإعدادي)",
    certificateTitle: "Basic Cycle School Transcript",
    certificateTitleArabic: "كشف درجات المرحلة الإعدادية",
    subjects: [
      { name: "Holy Quran", arabicName: "القرآن الكريم", maxScore: 100, passingScore: 50, order: 1 },
      { name: "Hadith", arabicName: "الحديث", maxScore: 100, passingScore: 50, order: 2 },
      { name: "Tawheed", arabicName: "التوحيد", maxScore: 100, passingScore: 50, order: 3 },
      { name: "Fiqh", arabicName: "الفقه", maxScore: 100, passingScore: 50, order: 4 },
      { name: "Seerah", arabicName: "السيرة", maxScore: 100, passingScore: 50, order: 5 },
      { name: "Arabic Literature", arabicName: "الأدب العربي", maxScore: 100, passingScore: 50, order: 6 },
      { name: "Rhetoric", arabicName: "البلاغة", maxScore: 100, passingScore: 50, order: 7 },
      { name: "Grammar & Syntax", arabicName: "النحو والصرف", maxScore: 100, passingScore: 50, order: 8 },
      { name: "Composition", arabicName: "التعبير", maxScore: 100, passingScore: 50, order: 9 },
      { name: "Science", arabicName: "Science", maxScore: 100, passingScore: 50, order: 10 },
      { name: "Mathematics", arabicName: "Mathematics", maxScore: 100, passingScore: 50, order: 11 },
      { name: "S.E.S", arabicName: "S.E.S", maxScore: 100, passingScore: 50, order: 12 },
      { name: "English", arabicName: "English", maxScore: 100, passingScore: 50, order: 13 },
      { name: "Islamic History", arabicName: "التاريخ الإسلامي", maxScore: 100, passingScore: 50, order: 14 },
    ],
  },
  12: {
    gradeName: "Grade 12 (SSS)",
    gradeNameArabic: "الصف الثاني عشر (الثانوي)",
    certificateTitle: "Senior Secondary School Transcript",
    certificateTitleArabic: "كشف درجات المرحلة الثانوية",
    subjects: [
      { name: "Holy Quran & Tajweed", arabicName: "القرآن الكريم والتجويد", maxScore: 100, passingScore: 50, order: 1 },
      { name: "Hadith Sciences", arabicName: "علوم الحديث", maxScore: 100, passingScore: 50, order: 2 },
      { name: "Tawheed & Aqeedah", arabicName: "التوحيد والعقيدة", maxScore: 100, passingScore: 50, order: 3 },
      { name: "Fiqh & Usul", arabicName: "الفقه وأصوله", maxScore: 100, passingScore: 50, order: 4 },
      { name: "Tafseer", arabicName: "التفسير", maxScore: 100, passingScore: 50, order: 5 },
      { name: "Arabic Literature", arabicName: "الأدب العربي", maxScore: 100, passingScore: 50, order: 6 },
      { name: "Rhetoric & Criticism", arabicName: "البلاغة والنقد", maxScore: 100, passingScore: 50, order: 7 },
      { name: "Grammar & Syntax", arabicName: "النحو والصرف", maxScore: 100, passingScore: 50, order: 8 },
      { name: "Composition", arabicName: "التعبير", maxScore: 100, passingScore: 50, order: 9 },
      { name: "Islamic History", arabicName: "التاريخ الإسلامي", maxScore: 100, passingScore: 50, order: 10 },
      { name: "Science", arabicName: "Science", maxScore: 100, passingScore: 50, order: 11 },
      { name: "Mathematics", arabicName: "Mathematics", maxScore: 100, passingScore: 50, order: 12 },
      { name: "English", arabicName: "English", maxScore: 100, passingScore: 50, order: 13 },
    ],
  },
};

export function getGradeConfig(grade: number): GradeTranscriptConfig {
  // Return the config for the grade, or fallback to the closest matching grade
  if (gradeTranscriptConfigs[grade]) {
    return gradeTranscriptConfigs[grade];
  }
  
  // Fallback logic: use the closest grade level template
  if (grade <= 3) {
    return gradeTranscriptConfigs[3];
  } else if (grade <= 6) {
    return gradeTranscriptConfigs[6];
  } else if (grade <= 9) {
    return gradeTranscriptConfigs[9];
  } else {
    return gradeTranscriptConfigs[12];
  }
}

export function isEnglishSubject(arabicName: string): boolean {
  const englishSubjects = ['Science', 'Mathematics', 'S.E.S', 'English', 'S.E.S.', 'Math', 'Maths'];
  return englishSubjects.some(s => 
    arabicName.toLowerCase().includes(s.toLowerCase()) || 
    arabicName === s
  );
}

export const gradeLabelsArabic: Record<number, string> = {
  1: "الصف الأول",
  2: "الصف الثاني",
  3: "الصف الثالث",
  4: "الصف الرابع",
  5: "الصف الخامس",
  6: "الصف السادس",
  7: "الصف السابع",
  8: "الصف الثامن",
  9: "الصف التاسع",
  10: "الصف العاشر",
  11: "الصف الحادي عشر",
  12: "الصف الثاني عشر",
};

export const gradeLabelsEnglish: Record<number, string> = {
  1: "Grade 1 (LBS)",
  2: "Grade 2 (LBS)",
  3: "Grade 3 (LBS)",
  4: "Grade 4 (UBS)",
  5: "Grade 5 (UBS)",
  6: "Grade 6 (UBS)",
  7: "Grade 7 (BCS)",
  8: "Grade 8 (BCS)",
  9: "Grade 9 (BCS)",
  10: "Grade 10 (SSS)",
  11: "Grade 11 (SSS)",
  12: "Grade 12 (SSS)",
};

// Get Arabic label for any grade with fallback
export function getGradeLabelArabic(grade: number): string {
  return gradeLabelsArabic[grade] || `الصف ${grade}`;
}

// Get English label for any grade with fallback
export function getGradeLabelEnglish(grade: number): string {
  return gradeLabelsEnglish[grade] || `Grade ${grade}`;
}
