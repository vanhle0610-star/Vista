'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import styles from './LanguageSelector.module.css';

import { CountryFlag } from '@/components/common/CountryFlag';

interface LanguageSelectorProps {
  isNight?: boolean;
  align?: 'left' | 'right';
  className?: string;
}

export function LanguageSelector({ isNight = false, align = 'right', className = '' }: LanguageSelectorProps) {
  const { currentLanguage, setLanguage, languages, currentLangConfig, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`${styles.selectorContainer} ${isNight ? styles.night : ''} ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${styles.triggerBtn} ${isOpen ? styles.active : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        title={t.langSelectTitle}
      >
        <span className={styles.globeIcon}>🌐</span>
        <CountryFlag countryCode={currentLangConfig.code} width={18} height={12} />
        <span className={styles.langCode}>{currentLangConfig.code.toUpperCase()}</span>
        <span className={`${styles.chevron} ${isOpen ? styles.rotated : ''}`}>▾</span>
      </button>

      {isOpen && (
        <div
          className={`${styles.dropdownMenu} ${align === 'left' ? styles.alignLeft : styles.alignRight}`}
          role="listbox"
          aria-label={t.langSelectTitle}
        >
          <div className={styles.dropdownHeader}>
            <span className={styles.headerTitle}>{t.langSelectTitle}</span>
            <span className={styles.badgeCount}>10 Quốc gia</span>
          </div>

          <div className={styles.languagesList}>
            {languages.map((lang) => {
              const isSelected = lang.code === currentLanguage;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`${styles.langOption} ${isSelected ? styles.selected : ''}`}
                >
                  <span className={styles.optionFlag}>
                    <CountryFlag countryCode={lang.code} width={22} height={15} />
                  </span>
                  <div className={styles.optionInfo}>
                    <span className={styles.optionNative}>{lang.nativeName}</span>
                    <span className={styles.optionCountry}>{lang.country}</span>
                  </div>
                  {isSelected && <span className={styles.checkIcon}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
