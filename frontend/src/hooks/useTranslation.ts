'use client';

import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { translations, defaultLanguage, LanguageCode } from '@/locales';
import { apiClient } from '@/utils/apiClient';

function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return path;
  }
  return value || path;
}

export function useTranslation() {
  const { user, checkAuth } = useAuth();
  
  // Memoize language to ensure it updates when user changes
  const language: LanguageCode = useMemo(() => {
    const lang = (user?.language as LanguageCode) || defaultLanguage;
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('[useTranslation] Current language:', lang, 'User:', user?.id, user?.language);
    }
    return lang;
  }, [user?.language, user?.id]);

  const t = useMemo(() => {
    const translation = translations[language] || translations[defaultLanguage];
    
    return (key: string): string => {
      return getNestedValue(translation, key);
    };
  }, [language]);

  return {
    t,
    language,
    setLanguage: async (lang: LanguageCode): Promise<boolean> => {
      try {
        console.log('[useTranslation] Setting language to:', lang);
        const response = await apiClient.updateLanguage(lang);

        console.log('[useTranslation] Language update response:', response);

        if (response.success) {
          // Refresh user data to get updated language
          console.log('[useTranslation] Refreshing auth...');
          await checkAuth();
          console.log('[useTranslation] Auth refreshed');
          return true;
        } else {
          console.error('Language update failed:', response.error);
          return false;
        }
      } catch (error) {
        console.error('Failed to update language:', error);
        return false;
      }
    },
  };
}

