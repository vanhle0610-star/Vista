'use client';

import React, {
  createContext,
  useContext,
  useSyncExternalStore,
  ReactNode,
  useMemo,
  useState,
  useCallback,
} from 'react';
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

function getStoredLanguage(): string {
  if (typeof window === 'undefined') return 'vi';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && TRANSLATIONS[saved]) {
      return saved;
    }
    const navLang = navigator.language.slice(0, 2).toLowerCase();
    if (TRANSLATIONS[navLang]) {
      return navLang;
    }
  } catch {
    // LocalStorage might fail in restricted iframe / SSR
  }
  return 'vi';
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener('vista-lang-change', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('vista-lang-change', callback);
  };
}

function getServerSnapshot(): string {
  return 'vi';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Component-scoped fallback state for restricted environments where localStorage is blocked
  const [memoryLang, setMemoryLang] = useState<string | null>(null);

  const storedLanguage = useSyncExternalStore(
    subscribe,
    getStoredLanguage,
    getServerSnapshot
  );

  const currentLanguage = memoryLang || storedLanguage;

  const setLanguage = useCallback((lang: string) => {
    if (TRANSLATIONS[lang]) {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
        setMemoryLang(null);
        window.dispatchEvent(new Event('vista-lang-change'));
      } catch {
        // Fallback to component-scoped state if localStorage is blocked
        setMemoryLang(lang);
      }
    }
  }, []);

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
