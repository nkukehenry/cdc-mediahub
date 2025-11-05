/**
 * Utility functions for localStorage caching with expiration
 */

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // milliseconds
}

const DEFAULT_EXPIRY = 5 * 60 * 1000; // 5 minutes

export function getCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const cached: CachedData<T> = JSON.parse(item);
    const now = Date.now();
    
    // Check if expired
    if (now - cached.timestamp > cached.expiresIn) {
      localStorage.removeItem(key);
      return null;
    }

    return cached.data;
  } catch (error) {
    console.error(`Error reading cache for key ${key}:`, error);
    return null;
  }
}

export function setCachedData<T>(key: string, data: T, expiresIn: number = DEFAULT_EXPIRY): void {
  if (typeof window === 'undefined') return;

  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      expiresIn,
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
  }
}

export function clearCachedData(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function clearAllCache(): void {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('cache_')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

// Cache keys
export const CACHE_KEYS = {
  LATEST_PUBLICATIONS: 'cache_latest_publications',
  FEATURED_PUBLICATIONS: 'cache_featured_publications',
  LEADERBOARD_PUBLICATIONS: 'cache_leaderboard_publications',
  CATEGORIES: 'cache_categories',
  NAV_LINKS: 'cache_nav_links',
  PUBLICATIONS_MENU: 'cache_publications_menu',
  YOUTUBE_LIVE_EVENTS: 'cache_youtube_live_events',
} as const;

