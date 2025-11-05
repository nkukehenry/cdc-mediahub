import en from './en';
import ar from './ar';
import fr from './fr';
import pt from './pt';
import es from './es';
import sw from './sw';

export type LanguageCode = 'ar' | 'en' | 'fr' | 'pt' | 'es' | 'sw';

export const translations = {
  ar,
  en,
  fr,
  pt,
  es,
  sw,
} as const;

export const languageNames: Record<LanguageCode, string> = {
  ar: 'العربية',
  en: 'English',
  fr: 'Français',
  pt: 'Português',
  es: 'Español',
  sw: 'Kiswahili',
};

export const defaultLanguage: LanguageCode = 'en';

