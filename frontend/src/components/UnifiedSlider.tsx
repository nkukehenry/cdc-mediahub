'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/utils/apiClient';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/utils/cacheUtils';
import ContentSlider from './ContentSlider';

interface UnifiedSliderProps {
  limit?: number;
}

interface Publication {
  id: string;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  isFeatured?: boolean;
  isLeaderboard?: boolean;
  publicationDate?: string;
  createdAt?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function UnifiedSlider({ limit = 10 }: UnifiedSliderProps) {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublications();
  }, [limit]);

  const loadPublications = async () => {
    try {
      setLoading(true);

      // Try to get cached data first
      const cachedData = getCachedData<Publication[]>(CACHE_KEYS.FEATURED_PUBLICATIONS);
      if (cachedData && cachedData.length > 0) {
        setPublications(cachedData);
        setLoading(false);
      }

      // Fetch both featured and leadership publications
      const [featuredRes, leaderboardRes] = await Promise.all([
        apiClient.getFeaturedPublications(limit),
        apiClient.getLeaderboardPublications(limit)
      ]);

      const combined: Publication[] = [];

      // Add featured publications with badge
      if (featuredRes.success && featuredRes.data?.posts) {
        featuredRes.data.posts.forEach((pub: Publication) => {
          combined.push({ ...pub, isFeatured: true });
        });
      }

      // Add leadership publications with badge
      if (leaderboardRes.success && leaderboardRes.data?.posts) {
        leaderboardRes.data.posts.forEach((pub: Publication) => {
          // Avoid duplicates
          if (!combined.find(p => p.id === pub.id)) {
            combined.push({ ...pub, isLeaderboard: true });
          }
        });
      }

      // Sort by publication date or created date (newest first)
      combined.sort((a, b) => {
        const dateA = a.publicationDate || a.createdAt || '';
        const dateB = b.publicationDate || b.createdAt || '';
        return dateB.localeCompare(dateA);
      });

      setPublications(combined);
      setCachedData(CACHE_KEYS.FEATURED_PUBLICATIONS, combined);
    } catch (error) {
      console.error('Failed to load publications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg p-12 flex items-center justify-center" style={{ minHeight: '500px' }}>
        <div className="text-gray-700">Loading content...</div>
      </div>
    );
  }

  if (publications.length === 0) {
    return null;
  }

  // Group publications by badge type for the slider
  const sliderItems = publications.map((pub) => ({
    ...pub,
    badgeLabel: pub.isFeatured ? 'Featured' : pub.isLeaderboard ? 'Leadership' : undefined
  }));

  return (
    <ContentSlider
      publications={sliderItems}
      title=""
      className="w-full"
    />
  );
}

