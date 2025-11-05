'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/utils/apiClient';
import ContentSlider from './ContentSlider';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/utils/cacheUtils';

interface LeadershipSliderProps {
  limit?: number;
}

export default function LeadershipSlider({ limit = 10 }: LeadershipSliderProps) {
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeadership();
  }, [limit]);

  const loadLeadership = async () => {
    try {
      setLoading(true);

      // Try to get cached data first
      const cachedData = getCachedData<any[]>(CACHE_KEYS.LEADERBOARD_PUBLICATIONS);
      if (cachedData && cachedData.length > 0) {
        setPublications(cachedData);
        setLoading(false);
      }

      // Always fetch fresh data in background
      const response = await apiClient.getLeaderboardPublications(limit);
      if (response.success && response.data?.posts) {
        setPublications(response.data.posts);
        setCachedData(CACHE_KEYS.LEADERBOARD_PUBLICATIONS, response.data.posts);
      }
    } catch (error) {
      console.error('Failed to load leadership publications:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 flex items-center justify-center">
        <div className="text-au-grey-text/70">Loading leadership content...</div>
      </div>
    );
  }

  if (publications.length === 0) {
    return null;
  }

  return (
    <ContentSlider
      publications={publications}
      title="Leadership"
      badgeLabel="Leadership"
      className="h-full"
    />
  );
}

