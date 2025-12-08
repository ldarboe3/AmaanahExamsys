import { db } from "./db";
import { approvedSurnames } from "@shared/schema";
import { eq, ilike } from "drizzle-orm";

const APPROVED_GAMBIAN_SURNAMES = [
  "Badjie", "Bah", "Baldeh", "Barry", "Bojang", "Camara", "Ceesay", "Cham",
  "Coker", "Colley", "Conteh", "Correa", "Cole", "Daffeh", "Darboe", "Drammeh",
  "Fadera", "Faal", "Findley", "Fofana", "Gassama", "Gaye", "Gibba", "Grant",
  "Jadama", "Jabang", "Jabbie", "Jallow", "Jammeh", "Janneh", "Jarju", "Jarrett",
  "Jatta", "Jawo", "Jeng", "Jobe", "Johnson", "Jonga", "Kah", "Kanyi", "Keita",
  "Kinteh", "Komma", "Krubally", "Kujabi", "Lette", "Manneh", "Marong", "Mballow",
  "Mendy", "Ndow", "Njai", "Njie", "Nyang", "Sabally", "Saidy", "Faye", "SaidyKhan",
  "Saho", "Sambou", "Sanneh", "Sanyang", "Sarr", "Secka", "Senghore", "Sidibeh",
  "Sillah", "Sisay", "Sonko", "Sow", "Sowe", "Susso", "Taal", "Thomas", "Touray",
  "Trawally", "Tunkara", "Williams"
];

const ALTERNATE_SPELLINGS: Record<string, string[]> = {
  "Badjie": ["Badgie", "Badjee", "Badji"],
  "Bah": ["Ba", "Baa"],
  "Baldeh": ["Balde", "Baldé", "Baldy"],
  "Barry": ["Barri", "Bari"],
  "Bojang": ["Boujang", "Bujang"],
  "Camara": ["Kamara", "Camarra"],
  "Ceesay": ["Cesay", "Ceasay", "Cisay", "Cessey", "Sise", "Cissé"],
  "Cham": ["Tcham", "Tjam"],
  "Colley": ["Coley", "Kolley", "Koley"],
  "Conteh": ["Conte", "Konte", "Konté"],
  "Darboe": ["Darbo", "Darboh"],
  "Drammeh": ["Drameh", "Drame", "Dramé"],
  "Faal": ["Fall", "Fal"],
  "Fofana": ["Fuffana", "Fufana"],
  "Gassama": ["Gasama", "Gassam"],
  "Gaye": ["Gay", "Gai"],
  "Jabang": ["Jabeng", "Jabaang"],
  "Jallow": ["Jalo", "Jalloh", "Diallo", "Jalow"],
  "Jammeh": ["Jameh", "Jame"],
  "Janneh": ["Janeh", "Jane"],
  "Jarju": ["Jarjue", "Jarjou"],
  "Jatta": ["Jata", "Jatah"],
  "Jeng": ["Jing", "Jengeh"],
  "Jobe": ["Job", "Jobi"],
  "Manneh": ["Mane", "Maneh", "Mané"],
  "Marong": ["Marrong", "Marung"],
  "Mendy": ["Mendi", "Mendee"],
  "Ndow": ["Ndou", "Ndaw"],
  "Njai": ["Njay", "Njah", "Njaye"],
  "Njie": ["Nji", "Njee", "Ndiaye"],
  "Sabally": ["Sabaly", "Sabaleh"],
  "Saidy": ["Saide", "Saideh"],
  "Saho": ["Sao", "Sahoe"],
  "Sanneh": ["Sane", "Saneh", "Sané"],
  "Sanyang": ["Saniyang", "Sannyang"],
  "Sarr": ["Sar", "Saar"],
  "Sidibeh": ["Sidibe", "Sidibé"],
  "Sillah": ["Silla", "Sila"],
  "Sisay": ["Sise", "Cissé", "Sissay"],
  "Sonko": ["Sanko", "Sunko"],
  "Sow": ["Sou", "So"],
  "Sowe": ["Sou", "Souwe"],
  "Susso": ["Suso", "Sissoko"],
  "Taal": ["Tal", "Tall"],
  "Touray": ["Toure", "Turay", "Ture", "Touré"],
  "Trawally": ["Trawaly", "Traoré", "Traore"]
};

const TRANSLITERATION_RULES: Array<{ pattern: RegExp; replacement: string; canonical: string }> = [
  { pattern: /^diallo$/i, replacement: "Jallow", canonical: "Jallow" },
  { pattern: /^jalloh$/i, replacement: "Jallow", canonical: "Jallow" },
  { pattern: /^ndiaye$/i, replacement: "Njie", canonical: "Njie" },
  { pattern: /^cisse$/i, replacement: "Ceesay", canonical: "Ceesay" },
  { pattern: /^sise$/i, replacement: "Ceesay", canonical: "Ceesay" },
  { pattern: /^mane$/i, replacement: "Manneh", canonical: "Manneh" },
  { pattern: /^sane$/i, replacement: "Sanneh", canonical: "Sanneh" },
  { pattern: /^toure$/i, replacement: "Touray", canonical: "Touray" },
  { pattern: /^traore$/i, replacement: "Trawally", canonical: "Trawally" },
  { pattern: /^sidibe$/i, replacement: "Sidibeh", canonical: "Sidibeh" },
  { pattern: /^konte$/i, replacement: "Conteh", canonical: "Conteh" },
  { pattern: /^drame$/i, replacement: "Drammeh", canonical: "Drammeh" },
  { pattern: /^balde$/i, replacement: "Baldeh", canonical: "Baldeh" },
  { pattern: /^kamara$/i, replacement: "Camara", canonical: "Camara" },
  { pattern: /^sissoko$/i, replacement: "Susso", canonical: "Susso" },
];

let cachedSurnames: Map<string, string> | null = null;

function removeDiacritics(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cleanSurname(surname: string): string {
  return removeDiacritics(surname.trim())
    .replace(/[^\w\s'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSurname(fullName: string): string {
  const cleanedName = fullName.trim().replace(/\s+/g, ' ');
  const nameParts = cleanedName.split(' ');
  
  if (nameParts.length === 0) return '';
  
  return nameParts[nameParts.length - 1];
}

function calculateLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

async function loadSurnameCache(): Promise<Map<string, string>> {
  if (cachedSurnames) return cachedSurnames;
  
  cachedSurnames = new Map();
  
  for (const surname of APPROVED_GAMBIAN_SURNAMES) {
    cachedSurnames.set(surname.toLowerCase(), surname);
    
    const alternates = ALTERNATE_SPELLINGS[surname];
    if (alternates) {
      for (const alt of alternates) {
        const normalizedAlt = removeDiacritics(alt).toLowerCase();
        cachedSurnames.set(normalizedAlt, surname);
        cachedSurnames.set(alt.toLowerCase(), surname);
      }
    }
  }
  
  return cachedSurnames;
}

function applyTransliterationRules(surname: string): string | null {
  const cleanedSurname = cleanSurname(surname);
  
  for (const rule of TRANSLITERATION_RULES) {
    if (rule.pattern.test(cleanedSurname)) {
      return rule.canonical;
    }
  }
  
  return null;
}

function applyGambianNamingConventions(surname: string): string {
  let result = cleanSurname(surname);
  
  result = result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
  
  if (result.endsWith('a') || result.endsWith('o') || result.endsWith('u')) {
    if (!APPROVED_GAMBIAN_SURNAMES.some(s => s.toLowerCase() === result.toLowerCase())) {
      if (result.endsWith('a')) {
        const withEh = result.slice(0, -1) + 'eh';
        if (APPROVED_GAMBIAN_SURNAMES.some(s => s.toLowerCase() === withEh.toLowerCase())) {
          return withEh;
        }
      }
    }
  }
  
  if (result.toLowerCase().startsWith('nj') || result.toLowerCase().startsWith('nd')) {
    result = result.charAt(0).toUpperCase() + result.charAt(1).toLowerCase() + result.slice(2);
  }
  
  return result;
}

export interface SurnameNormalizationResult {
  originalSurname: string;
  normalizedSurname: string;
  origin: 'approved_list' | 'transliterated' | 'fuzzy_match' | 'manual';
  confidence: 'high' | 'medium' | 'low';
  matchedFrom?: string;
  notes?: string;
}

export async function normalizeSurname(surname: string): Promise<SurnameNormalizationResult> {
  const cache = await loadSurnameCache();
  const trimmedSurname = surname.trim();
  const lowerRaw = trimmedSurname.toLowerCase();
  
  const exactMatchRaw = cache.get(lowerRaw);
  if (exactMatchRaw) {
    return {
      originalSurname: surname,
      normalizedSurname: exactMatchRaw,
      origin: 'approved_list',
      confidence: 'high'
    };
  }
  
  const diacriticFreeRaw = removeDiacritics(lowerRaw);
  const diacriticFreeMatch = cache.get(diacriticFreeRaw);
  if (diacriticFreeMatch) {
    return {
      originalSurname: surname,
      normalizedSurname: diacriticFreeMatch,
      origin: 'approved_list',
      confidence: 'high'
    };
  }
  
  const cleanedSurname = cleanSurname(surname);
  const lowerSurname = cleanedSurname.toLowerCase();
  
  const cleanedMatch = cache.get(lowerSurname);
  if (cleanedMatch) {
    return {
      originalSurname: surname,
      normalizedSurname: cleanedMatch,
      origin: 'approved_list',
      confidence: 'high'
    };
  }
  
  const transliterated = applyTransliterationRules(cleanedSurname);
  if (transliterated) {
    return {
      originalSurname: surname,
      normalizedSurname: transliterated,
      origin: 'transliterated',
      confidence: 'high',
      notes: `Transliterated from "${cleanedSurname}" using Gambian naming conventions`
    };
  }
  
  let bestMatch: string | null = null;
  let bestDistance = Infinity;
  
  const cacheEntries = Array.from(cache.entries());
  for (let i = 0; i < cacheEntries.length; i++) {
    const canonical = cacheEntries[i][1];
    const distance = calculateLevenshteinDistance(lowerSurname, canonical.toLowerCase());
    if (distance <= 1 && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = canonical;
    }
  }
  
  if (bestMatch && bestDistance <= 1) {
    return {
      originalSurname: surname,
      normalizedSurname: bestMatch,
      origin: 'fuzzy_match',
      confidence: 'medium',
      matchedFrom: cleanedSurname,
      notes: `Fuzzy matched with distance ${bestDistance}`
    };
  }
  
  const gambianized = applyGambianNamingConventions(cleanedSurname);
  
  return {
    originalSurname: surname,
    normalizedSurname: gambianized,
    origin: 'manual',
    confidence: 'low',
    notes: 'No match found in approved list - applied standard capitalization'
  };
}

export async function normalizeStudentName(firstName: string, middleName: string | null, lastName: string): Promise<{
  firstName: string;
  middleName: string | null;
  lastName: string;
  surnameResult: SurnameNormalizationResult;
}> {
  const surnameResult = await normalizeSurname(lastName);
  
  return {
    firstName: firstName.trim(),
    middleName: middleName?.trim() || null,
    lastName: surnameResult.normalizedSurname,
    surnameResult
  };
}

export async function normalizeFullName(fullName: string): Promise<{
  firstName: string;
  middleName: string | null;
  lastName: string;
  surnameResult: SurnameNormalizationResult;
}> {
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 0) {
    return {
      firstName: '',
      middleName: null,
      lastName: '',
      surnameResult: {
        originalSurname: '',
        normalizedSurname: '',
        origin: 'manual',
        confidence: 'low',
        notes: 'Empty name provided'
      }
    };
  }
  
  if (parts.length === 1) {
    const surnameResult = await normalizeSurname(parts[0]);
    return {
      firstName: parts[0],
      middleName: null,
      lastName: surnameResult.normalizedSurname,
      surnameResult
    };
  }
  
  if (parts.length === 2) {
    const surnameResult = await normalizeSurname(parts[1]);
    return {
      firstName: parts[0],
      middleName: null,
      lastName: surnameResult.normalizedSurname,
      surnameResult
    };
  }
  
  const lastName = parts[parts.length - 1];
  const firstName = parts[0];
  const middleName = parts.slice(1, -1).join(' ');
  
  const surnameResult = await normalizeSurname(lastName);
  
  return {
    firstName,
    middleName,
    lastName: surnameResult.normalizedSurname,
    surnameResult
  };
}

export function getApprovedSurnamesList(): string[] {
  return [...APPROVED_GAMBIAN_SURNAMES];
}

export async function seedApprovedSurnames(): Promise<void> {
  console.log('Seeding approved Gambian surnames...');
  
  for (const surname of APPROVED_GAMBIAN_SURNAMES) {
    try {
      const existing = await db.select()
        .from(approvedSurnames)
        .where(eq(approvedSurnames.surnameLower, surname.toLowerCase()))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(approvedSurnames).values({
          surname,
          surnameLower: surname.toLowerCase(),
          alternateSpellings: ALTERNATE_SPELLINGS[surname] || [],
          isActive: true
        });
      }
    } catch (error) {
      console.error(`Failed to seed surname ${surname}:`, error);
    }
  }
  
  console.log(`Seeded ${APPROVED_GAMBIAN_SURNAMES.length} approved surnames`);
}

export async function validateSurnameAgainstList(surname: string): Promise<boolean> {
  const cache = await loadSurnameCache();
  const cleanedSurname = cleanSurname(surname).toLowerCase();
  return cache.has(cleanedSurname);
}

export function clearSurnameCache(): void {
  cachedSurnames = null;
}
