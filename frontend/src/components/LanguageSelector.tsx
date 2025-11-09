'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { languageNames, LanguageCode } from '@/locales';
import { cn } from '@/utils/fileUtils';
import { usePathname } from 'next/navigation';

// Google Translate language codes mapping
const googleTranslateCodes: Record<LanguageCode, string> = {
  en: 'en',
  ar: 'ar',
  fr: 'fr',
  pt: 'pt',
  es: 'es',
  sw: 'sw',
};

export default function LanguageSelector() {
  const { t, language, setLanguage } = useTranslation();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<LanguageCode>(language);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const googleTranslateRef = useRef<HTMLDivElement>(null);
  
  // Check if we're on a public page (not admin)
  const isPublicPage = !pathname?.startsWith('/admin');
  
  // Get current Google Translate language from cookie
  useEffect(() => {
    if (!isPublicPage) {
      setCurrentLang(language);
      return;
    }
    
    // Check cookie for Google Translate language
    const cookieMatch = document.cookie.match(/googtrans=([^;]+)/);
    if (cookieMatch) {
      const cookieValue = cookieMatch[1];
      // Cookie format is /en/fr or /en/es etc.
      const langMatch = cookieValue.match(/\/([a-z]{2})$/);
      if (langMatch) {
        const langCode = langMatch[1] as LanguageCode;
        if (Object.keys(googleTranslateCodes).includes(langCode)) {
          setCurrentLang(langCode);
        }
      }
    } else {
      // No cookie, default to English
      setCurrentLang('en');
    }
  }, [isPublicPage, language, pathname]);

  // Initialize Google Translate for public pages
  useEffect(() => {
    if (!isPublicPage) return;

    let isInitialized = false;
    const initGoogleTranslate = () => {
      if (isInitialized) {
        console.log('Google Translate already initialized');
        return;
      }
      
      if (!googleTranslateRef.current) {
        console.warn('Google Translate ref not available');
        return;
      }

      // Check if Google Translate API is loaded
      if (!(window as any).google?.translate) {
        console.warn('Google Translate API not loaded yet');
        return false;
      }

      try {
        // Check if already initialized by looking for the combo box
        if (document.querySelector('.goog-te-combo')) {
          console.log('Google Translate already initialized (found combo box)');
          isInitialized = true;
          return true;
        }

        // Make sure the container is in the DOM and visible for initialization
        const container = googleTranslateRef.current;
        const originalStyles = {
          display: container.style.display,
          visibility: container.style.visibility,
          position: container.style.position,
        };
        
        // Temporarily make visible for initialization
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.position = 'static';
        
        // Initialize Google Translate
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'en,ar,fr,pt,es,sw',
            layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          container
        );
        
        // Restore hidden styles after initialization
        setTimeout(() => {
          container.style.display = originalStyles.display || 'none';
          container.style.visibility = originalStyles.visibility || 'hidden';
          container.style.position = originalStyles.position || 'absolute';
        }, 500);
        
        isInitialized = true;
        console.log('Google Translate initialized successfully');
        return true;
      } catch (error) {
        console.error('Error initializing Google Translate:', error);
        return false;
      }
    };

    // Check if script is already loaded
    const existingScript = document.querySelector('script[src*="translate.google.com"]');
    if (existingScript) {
      console.log('Google Translate script already exists');
      // Script exists, wait for API and initialize
      let attempts = 0;
      const maxAttempts = 20;
      const checkInterval = setInterval(() => {
        attempts++;
        if ((window as any).google?.translate) {
          if (initGoogleTranslate()) {
            clearInterval(checkInterval);
          }
        } else if (attempts >= maxAttempts) {
          console.warn('Google Translate API not available after waiting');
          clearInterval(checkInterval);
        }
      }, 200);
      
      return () => clearInterval(checkInterval);
    }

    // Load Google Translate script
    console.log('Loading Google Translate script');
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    
    // Set up global callback (Google Translate expects this specific name)
    (window as any).googleTranslateElementInit = () => {
      console.log('Google Translate script loaded');
      // Wait a bit for the API to be fully available
      setTimeout(() => {
        let attempts = 0;
        const initInterval = setInterval(() => {
          attempts++;
          if (initGoogleTranslate()) {
            clearInterval(initInterval);
          } else if (attempts >= 10) {
            console.warn('Failed to initialize Google Translate after script load');
            clearInterval(initInterval);
          }
        }, 200);
      }, 300);
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Translate script');
    };
    
    document.head.appendChild(script);

    return () => {
      // Don't remove the callback as it might be needed
    };
  }, [isPublicPage]);

  // Listen for Google Translate language changes on public pages
  useEffect(() => {
    if (!isPublicPage) return;

    const handleTranslateChange = () => {
      try {
        const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
        if (select) {
          const googleLang = select.value;
          // Find our language code from Google Translate code
          const langCode = Object.entries(googleTranslateCodes).find(
            ([, code]) => code === googleLang
          )?.[0] as LanguageCode;
          
          if (langCode && langCode !== language) {
            // Update our language state to match Google Translate
            // But don't trigger API call for public pages
            // The visual change will be handled by Google Translate
          }
        }
      } catch (error) {
        console.error('Error handling translate change:', error);
      }
    };

    // Poll for Google Translate select element and listen for changes
    const interval = setInterval(() => {
      const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
      if (select) {
        select.addEventListener('change', handleTranslateChange);
        clearInterval(interval);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
      if (select) {
        select.removeEventListener('change', handleTranslateChange);
      }
    };
  }, [isPublicPage, language]);

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

  const setGoogleTranslateCookie = (googleLangCode: string) => {
    const cookieValue = `/en/${googleLangCode}`;
    const domain = window.location.hostname;
    const expiresPast = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';

    // Clear existing cookies
    document.cookie = `googtrans=; path=/; ${expiresPast}`;
    if (domain && domain !== 'localhost') {
      document.cookie = `googtrans=; path=/; domain=${domain}; ${expiresPast}`;
      document.cookie = `googtrans=; path=/; domain=.${domain}; ${expiresPast}`;
    }

    const maxAge = 'max-age=31536000';
    document.cookie = `googtrans=${cookieValue}; path=/; ${maxAge}`;

    if (domain && domain !== 'localhost') {
      document.cookie = `googtrans=${cookieValue}; path=/; domain=${domain}; ${maxAge}`;
      document.cookie = `googtrans=${cookieValue}; path=/; domain=.${domain}; ${maxAge}`;
    }
  };

  const handleLanguageChange = async (lang: LanguageCode) => {
    if (isPublicPage) {
      // For public pages, trigger Google Translate
      try {
        const googleLangCode = googleTranslateCodes[lang];
        
        // Update current language state immediately for UI feedback
        setCurrentLang(lang);
        setIsOpen(false);
        
        const applyLanguage = () => {
          const select = document.querySelector<HTMLSelectElement>('.goog-te-combo');
          if (!select) {
            return false;
          }

          if (select.value !== googleLangCode) {
            select.value = googleLangCode;
          }

          select.dispatchEvent(new Event('change'));
          return true;
        };

        if (applyLanguage()) {
          setGoogleTranslateCookie(googleLangCode);
          return;
        }

        let attempts = 0;
        const maxAttempts = 15;
        const interval = setInterval(() => {
          attempts += 1;
          if (applyLanguage()) {
            clearInterval(interval);
            setGoogleTranslateCookie(googleLangCode);
            setIsOpen(false);
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            setGoogleTranslateCookie(googleLangCode);
            window.location.reload();
          }
        }, 150);

      } catch (error) {
        console.error('Error changing Google Translate language:', error);
      }
    } else {
      // For admin pages, use the regular translation system
      const success = await setLanguage(lang);
      if (success) {
        setIsOpen(false);
      }
    }
  };

  // Hide Google Translate default UI and use our custom selector
  useEffect(() => {
    if (!isPublicPage) return;

    const style = document.createElement('style');
    style.id = 'google-translate-hide-styles';
    style.textContent = `
      .goog-te-banner-frame,
      .goog-te-menu-value,
      .goog-te-menu-frame {
        display: none !important;
      }
      body {
        top: 0px !important;
        position: static !important;
      }
      .goog-te-combo {
        position: absolute !important;
        left: -9999px !important;
        opacity: 0 !important;
        pointer-events: auto !important;
        visibility: hidden !important;
      }
      #google_translate_element {
        position: absolute !important;
        left: -9999px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
      }
      .skiptranslate {
        display: none !important;
      }
    `;
    
    // Only add if not already added
    if (!document.getElementById('google-translate-hide-styles')) {
      document.head.appendChild(style);
    }

    return () => {
      // Keep styles for other components that might need them
    };
  }, [isPublicPage]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Hidden Google Translate element for public pages - must be in DOM for initialization */}
      {isPublicPage && (
        <div 
          id="google_translate_element" 
          ref={googleTranslateRef}
          aria-hidden="true"
        />
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-white hover:text-white hover:bg-au-corporate-green/80 rounded-lg transition-colors"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{languageNames[isPublicPage ? currentLang : language]}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-200">
            <p className="text-xs font-medium text-au-grey-text/70">{t('language.select')}</p>
          </div>
          {(Object.keys(languageNames) as LanguageCode[]).map((lang) => {
            const isSelected = isPublicPage ? currentLang === lang : language === lang;
            return (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={cn(
                  'w-full text-left px-4 py-2 text-sm transition-colors',
                  isSelected
                    ? 'bg-au-gold/20 text-au-green font-medium'
                    : 'text-au-grey-text hover:bg-au-gold/5'
                )}
              >
                {languageNames[lang]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

