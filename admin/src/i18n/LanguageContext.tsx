'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import {
  SUPPORTED_LANGUAGES,
  TRANSLATIONS,
  LanguageConfig,
  TranslationDictionary,
} from './languages';

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  t: TranslationDictionary;
  languages: LanguageConfig[];
  currentLangConfig: LanguageConfig;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'vista_lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguageState] = useState<string>('vi');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && TRANSLATIONS[saved]) {
        setCurrentLanguageState(saved);
      } else {
        // Detect browser language if available
        const navLang = navigator.language.slice(0, 2).toLowerCase();
        if (TRANSLATIONS[navLang]) {
          setCurrentLanguageState(navLang);
        }
      }
    } catch {
      // LocalStorage might fail in restricted iframe / SSR
    }
  }, []);

  const setLanguage = (lang: string) => {
    if (TRANSLATIONS[lang]) {
      setCurrentLanguageState(lang);
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // Ignore storage error
      }
    }
  };

  const t = useMemo(() => {
    return TRANSLATIONS[currentLanguage] || TRANSLATIONS['vi'];
  }, [currentLanguage]);

  const currentLangConfig = useMemo(() => {
    return (
      SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) ||
      SUPPORTED_LANGUAGES[0]
    );
  }, [currentLanguage]);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        currentLangConfig,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
