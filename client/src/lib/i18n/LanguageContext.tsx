import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { translations, type Language, type TranslationKeys } from './translations';

// Converts Western Arabic numerals (0-9) to Eastern Arabic-Indic numerals (٠-٩) when in Arabic mode.
// Pass isArabic=false (or omit) to return the value unchanged.
export function toArabicNumerals(value: string | number, isArabic: boolean): string {
  if (!isArabic) return String(value);
  return String(value).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  isRTL: boolean;
  toAr: (value: string | number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'amaanah-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'ar' || stored === 'en') {
        return stored;
      }
    }
    return 'en';
  });

  const isRTL = language === 'ar';

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    if (isRTL) {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  }, [language, isRTL]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = translations[language];
  const toAr = useCallback((value: string | number) => toArabicNumerals(value, isRTL), [isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL, toAr }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
