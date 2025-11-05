'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { languageNames, LanguageCode } from '@/locales';
import { cn } from '@/utils/fileUtils';

export default function LanguageSelector() {
  const { t, language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = async (lang: LanguageCode) => {
    const success = await setLanguage(lang);
    if (success) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-white hover:text-white hover:bg-au-corporate-green/80 rounded-lg transition-colors"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{languageNames[language]}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-200">
            <p className="text-xs font-medium text-au-grey-text/70">{t('language.select')}</p>
          </div>
          {(Object.keys(languageNames) as LanguageCode[]).map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={cn(
                'w-full text-left px-4 py-2 text-sm transition-colors',
                language === lang
                  ? 'bg-au-gold/20 text-au-green font-medium'
                  : 'text-au-grey-text hover:bg-au-gold/5'
              )}
            >
              {languageNames[lang]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

