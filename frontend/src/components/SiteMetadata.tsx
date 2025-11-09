'use client';

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { fetchPublicSettings } from '@/store/settingsSlice';
import { getImageUrl } from '@/utils/fileUtils';

/**
 * Component to dynamically update page metadata (title, description, favicon)
 * based on settings from Redux store
 */
export default function SiteMetadata() {
  const dispatch = useDispatch();
  const { settings } = useSelector((state: RootState) => state.settings);

  // Initialize settings fetch on mount
  useEffect(() => {
    dispatch(fetchPublicSettings() as any);
  }, [dispatch]);

  useEffect(() => {
    if (!settings) return;

    // Update document title
    if (settings.seo?.metaTitle) {
      document.title = settings.seo.metaTitle;
    } else if (settings.site?.name) {
      document.title = settings.site.name;
    }

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (settings.seo?.metaDescription) {
      if (metaDescription) {
        metaDescription.setAttribute('content', settings.seo.metaDescription);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = settings.seo.metaDescription;
        document.head.appendChild(meta);
      }
    }

    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (settings.seo?.metaKeywords) {
      if (metaKeywords) {
        metaKeywords.setAttribute('content', settings.seo.metaKeywords);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'keywords';
        meta.content = settings.seo.metaKeywords;
        document.head.appendChild(meta);
      }
    }

    // Update favicon
    if (settings.favicon) {
      const faviconUrl = getImageUrl(settings.favicon);
      const existingFavicon = document.querySelector('link[rel="icon"]');
      const existingShortcutIcon = document.querySelector('link[rel="shortcut icon"]');
      const existingAppleIcon = document.querySelector('link[rel="apple-touch-icon"]');

      if (existingFavicon) {
        existingFavicon.setAttribute('href', faviconUrl);
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = faviconUrl;
        document.head.appendChild(link);
      }

      if (existingShortcutIcon) {
        existingShortcutIcon.setAttribute('href', faviconUrl);
      } else {
        const shortcutLink = document.createElement('link');
        shortcutLink.rel = 'shortcut icon';
        shortcutLink.href = faviconUrl;
        document.head.appendChild(shortcutLink);
      }

      if (existingAppleIcon) {
        existingAppleIcon.setAttribute('href', faviconUrl);
      } else {
        const appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        appleLink.href = faviconUrl;
        document.head.appendChild(appleLink);
      }
    }
  }, [settings]);

  return null; // This component doesn't render anything
}

