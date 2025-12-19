const MALE_NAMES = new Set([
  'محمد', 'أحمد', 'عبدالله', 'عبد الله', 'إبراهيم', 'ابراهيم', 'عمر', 'علي', 'عثمان', 'أبوبكر', 'ابو بكر',
  'خالد', 'يوسف', 'حسن', 'حسين', 'عبدالرحمن', 'عبد الرحمن', 'سليمان', 'موسى', 'عيسى', 'داود', 'داوود',
  'يحيى', 'زكريا', 'إسماعيل', 'اسماعيل', 'إسحاق', 'اسحاق', 'يعقوب', 'آدم', 'ادم', 'نوح', 'هود', 'صالح',
  'لوط', 'شعيب', 'أيوب', 'ايوب', 'يونس', 'إلياس', 'الياس', 'اليسع', 'ذو الكفل', 'طالوت', 'جالوت',
  'عبدالعزيز', 'عبد العزيز', 'عبدالملك', 'عبد الملك', 'عبدالكريم', 'عبد الكريم', 'عبدالحكيم', 'عبد الحكيم',
  'عبدالرحيم', 'عبد الرحيم', 'عبدالواحد', 'عبد الواحد', 'عبدالسلام', 'عبد السلام', 'عبدالقادر', 'عبد القادر',
  'عبدالباسط', 'عبد الباسط', 'عبدالرزاق', 'عبد الرزاق', 'عبدالغني', 'عبد الغني', 'عبداللطيف', 'عبد اللطيف',
  'مصطفى', 'مختار', 'محمود', 'منصور', 'ممدوح', 'معاذ', 'معاوية', 'مروان', 'مازن', 'مالك',
  'فيصل', 'فهد', 'فاروق', 'فضل', 'فتحي', 'فريد', 'فوزي', 'فؤاد',
  'سعد', 'سعيد', 'سالم', 'سامي', 'سليم', 'سراج', 'سيف', 'سيد', 'شريف', 'شهاب',
  'كريم', 'كمال', 'قاسم', 'قيس', 'قتيبة',
  'جمال', 'جمعة', 'جبريل', 'جلال', 'جابر', 'جاسم',
  'بكر', 'بلال', 'بدر', 'باسم', 'بشير', 'براهيم', 'برهان',
  'نبيل', 'ناصر', 'نور الدين', 'نعمان', 'نضال', 'نذير',
  'رشيد', 'رياض', 'رمضان', 'راشد', 'رافع', 'رجب', 'ربيع',
  'طارق', 'طاهر', 'طلال', 'طلحة', 'توفيق', 'تامر', 'تيسير',
  'هارون', 'هاشم', 'هشام', 'هيثم', 'حمزة', 'حامد', 'حاتم', 'حبيب', 'حسام',
  'وليد', 'واصل', 'وسيم', 'وائل',
  'زياد', 'زكي', 'زيد', 'زين', 'زبير', 'زهير',
  'لؤي', 'ليث', 'لقمان',
  'أنس', 'انس', 'أسامة', 'اسامة', 'أشرف', 'اشرف', 'أمين', 'امين', 'أمجد', 'امجد', 'أيمن', 'ايمن',
  'إدريس', 'ادريس', 'إمام', 'امام',
  'صفوان', 'صهيب', 'صدام', 'صبحي', 'صابر', 'صخر',
  'ضياء', 'ضرار',
  'غازي', 'غانم', 'غسان', 'غريب',
  'ظافر', 'ظاهر',
  'ثابت', 'ثامر',
  'عمار', 'عماد', 'عادل', 'عارف', 'عاصم', 'عامر', 'عبيد', 'عزيز', 'عفيف', 'عقيل', 'علاء',
  'لبيب', 'لطفي',
  'مبارك', 'مجاهد', 'مجيد', 'محسن', 'مدحت', 'مراد', 'مرتضى', 'مسعود', 'مشاري', 'معتز', 'معين',
  'نجيب', 'نسيم', 'نوري', 'نواف',
  'هادي', 'همام', 'هلال', 'هذلول',
  'ياسين', 'ياسر', 'يزيد', 'يامن',
  'شاكر', 'شادي', 'شوقي', 'شفيق',
  'أمادو', 'امادو', 'مامادو', 'لامين', 'عليو', 'موسا', 'باكاري', 'سيدي', 'ماماتي', 'عثمانو',
  'ابوكار', 'فودي', 'سيريف', 'مالانغ', 'سنفو', 'يايا', 'مودو', 'سايكو', 'كيبا', 'باباكار',
  'عيسي', 'ابراما', 'يورو', 'إسماعيلا', 'اسماعيلا', 'ابوبكار', 'سوليمان',
]);

const FEMALE_NAMES = new Set([
  'فاطمة', 'عائشة', 'مريم', 'خديجة', 'زينب', 'هاجر', 'سارة', 'آسية', 'اسية', 'حواء',
  'رقية', 'أم كلثوم', 'ام كلثوم', 'حفصة', 'صفية', 'زين العابدين', 'سمية', 'جميلة', 'أمينة', 'امينة',
  'نورة', 'نورا', 'نوره', 'ليلى', 'ليلي', 'سلمى', 'سلوى', 'هدى', 'هديه', 'هديل',
  'رحمة', 'رحمه', 'بركة', 'بركه', 'سكينة', 'سكينه', 'حنان', 'إيمان', 'ايمان', 'إحسان', 'احسان',
  'آمنة', 'امنة', 'آمال', 'امال', 'أميرة', 'اميرة', 'أسماء', 'اسماء', 'أريج', 'اريج',
  'بثينة', 'بثينه', 'بسمة', 'بسمه', 'بتول', 'بهية', 'بيان',
  'تماضر', 'تغريد', 'تهاني', 'توفيقة',
  'جنان', 'جنى', 'جوهرة', 'جميلة', 'جيهان',
  'حليمة', 'حليمه', 'حنين', 'حورية', 'حبيبة',
  'خلود', 'خولة', 'خيرية',
  'دعاء', 'دينا', 'ديما', 'دالية', 'درية',
  'ذكرى', 'ذهبة',
  'رانيا', 'رانية', 'رباب', 'ربيعة', 'رشا', 'رغد', 'رفيدة', 'ريم', 'ريما', 'رزان', 'روان', 'روعة',
  'زهرة', 'زهراء', 'زكية', 'زبيدة', 'زمزم',
  'سارة', 'ساره', 'سميرة', 'سميره', 'سناء', 'سهام', 'سهى', 'سعاد', 'سعدية', 'سهيلة', 'سوسن', 'سيرين',
  'شيماء', 'شمس', 'شذى', 'شهد', 'شريفة', 'شفاء',
  'صباح', 'صفاء', 'صفية', 'صفوة',
  'ضحى', 'ضياء',
  'طيبة', 'طيف',
  'ظبية',
  'عبير', 'عزة', 'عفاف', 'علياء', 'عايدة', 'عهد',
  'غادة', 'غالية', 'غزل', 'غيداء',
  'فدوى', 'فريدة', 'فوزية', 'فجر', 'فرح', 'فلة',
  'قمر', 'قطر الندى',
  'كوثر', 'كريمة', 'كاملة',
  'لمياء', 'لمى', 'لبنى', 'لطيفة', 'لجين', 'لينا', 'لولوة',
  'ماجدة', 'مها', 'منى', 'منيرة', 'مروة', 'ملاك', 'ملكة', 'ميسون', 'ميساء', 'مرام', 'مشاعل', 'معالي',
  'نادية', 'ناديا', 'نجلاء', 'نجود', 'نجوى', 'نهى', 'نهلة', 'نعيمة', 'نوال', 'نوف', 'نورهان', 'نرمين',
  'هناء', 'هند', 'هبة', 'هالة', 'هيفاء', 'هيام', 'هنادي',
  'وفاء', 'وداد', 'ورد', 'وجدان', 'وسام', 'وصال',
  'ياسمين', 'يسرى', 'يمنى',
  'فاتو', 'ماريامة', 'ماريمة', 'ماريم', 'آمي', 'امي', 'نيانغ', 'أداما', 'ادامة', 'كومبا', 'إيسا', 'ايسا',
  'عيساتو', 'فاتوماتا', 'أمي', 'بنتة', 'كدياتو', 'ماري', 'جاي', 'نافي', 'نديي', 'تاتا', 'كمبا', 'جاينابا',
  'حيا', 'بينتا', 'أداماتا', 'ادماتا', 'عيشتو', 'عيشا', 'بجا', 'أميناتا', 'اميناتا', 'كادي', 'خدي', 'خديجتو',
]);

const MALE_MARKERS = ['بن', 'ابن', 'أبو', 'ابو'];
const FEMALE_MARKERS = ['بنت', 'أم', 'ام'];

const FEMALE_ENDINGS = ['ة', 'ه', 'ى'];
const MALE_SUFFIXES = ['و', 'ي'];

export interface GenderDetectionResult {
  gender: 'male' | 'female' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  matchedName?: string;
  matchType?: 'exact_match' | 'marker_match' | 'ending_match' | 'pattern_match';
}

function normalizeArabicName(name: string): string {
  return name
    .replace(/ـ/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ًٌٍَُِّْ]/g, '')
    .trim();
}

function extractFirstName(fullName: string): string {
  const normalized = normalizeArabicName(fullName);
  const parts = normalized.split(' ').filter(p => p.length > 0);
  return parts[0] || '';
}

function checkMarkers(fullName: string): { found: boolean; gender: 'male' | 'female' } | null {
  const normalized = normalizeArabicName(fullName);
  const parts = normalized.split(' ');
  
  for (const part of parts) {
    if (MALE_MARKERS.includes(part)) {
      return { found: true, gender: 'male' };
    }
    if (FEMALE_MARKERS.includes(part)) {
      return { found: true, gender: 'female' };
    }
  }
  
  return null;
}

function checkEnding(firstName: string): { match: boolean; gender: 'male' | 'female' } | null {
  if (firstName.length < 2) return null;
  
  const lastChar = firstName[firstName.length - 1];
  
  if (FEMALE_ENDINGS.includes(lastChar)) {
    const knownMaleWithFeminineEnding = [
      'معاوية', 'طلحة', 'حمزة', 'عقبة', 'أسامة', 'اسامة', 'عطية', 'أمية', 'امية', 'ربيعة'
    ];
    if (!knownMaleWithFeminineEnding.some(n => normalizeArabicName(n) === normalizeArabicName(firstName))) {
      return { match: true, gender: 'female' };
    }
  }
  
  return null;
}

export function detectGender(fullName: string): GenderDetectionResult {
  if (!fullName || fullName.trim().length === 0) {
    return { gender: 'unknown', confidence: 'low', reason: 'Empty name provided' };
  }

  const normalizedFullName = normalizeArabicName(fullName);
  const firstName = extractFirstName(fullName);
  const normalizedFirstName = normalizeArabicName(firstName);

  for (const maleName of Array.from(MALE_NAMES)) {
    const normalizedMale = normalizeArabicName(maleName);
    if (normalizedFirstName === normalizedMale || normalizedFullName.startsWith(normalizedMale + ' ')) {
      return { 
        gender: 'male', 
        confidence: 'high', 
        reason: `First name "${firstName}" is a known male name`,
        matchedName: maleName,
        matchType: 'exact_match'
      };
    }
  }

  for (const femaleName of Array.from(FEMALE_NAMES)) {
    const normalizedFemale = normalizeArabicName(femaleName);
    if (normalizedFirstName === normalizedFemale || normalizedFullName.startsWith(normalizedFemale + ' ')) {
      return { 
        gender: 'female', 
        confidence: 'high', 
        reason: `First name "${firstName}" is a known female name`,
        matchedName: femaleName,
        matchType: 'exact_match'
      };
    }
  }

  const markerResult = checkMarkers(fullName);
  if (markerResult) {
    return { 
      gender: markerResult.gender, 
      confidence: 'high', 
      reason: `Name contains ${markerResult.gender === 'male' ? 'masculine' : 'feminine'} marker (بن/بنت)`,
      matchType: 'marker_match'
    };
  }

  const endingResult = checkEnding(normalizedFirstName);
  if (endingResult) {
    return { 
      gender: endingResult.gender, 
      confidence: 'medium', 
      reason: `First name "${firstName}" has a ${endingResult.gender === 'female' ? 'feminine' : 'masculine'} ending`,
      matchType: 'ending_match'
    };
  }

  return { 
    gender: 'unknown', 
    confidence: 'low', 
    reason: `Unable to determine gender for "${fullName}"` 
  };
}

export function detectGenderBatch(names: string[]): Map<string, GenderDetectionResult> {
  const results = new Map<string, GenderDetectionResult>();
  for (const name of names) {
    results.set(name, detectGender(name));
  }
  return results;
}

export function getGenderLabel(gender: 'male' | 'female' | 'unknown', language: 'ar' | 'en' = 'ar'): string {
  const labels = {
    ar: {
      male: 'ذكر',
      female: 'أنثى',
      unknown: 'غير محدد'
    },
    en: {
      male: 'Male',
      female: 'Female',
      unknown: 'Unknown'
    }
  };
  return labels[language][gender];
}
