'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/utils/apiClient';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/utils/cacheUtils';
import { getImageUrl, PLACEHOLDER_IMAGE_PATH } from '@/utils/fileUtils';
import Skeleton from './Skeleton';

interface Publication {
  id: string;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  creator?: {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  publicationDate?: string;
  createdAt?: string;
}

interface LeadershipSliderProps {
  limit?: number;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const getAuthorName = (creator?: Publication['creator']) => {
  if (!creator) return 'Anonymous';
  if (creator.name) return creator.name;
  if (creator.firstName || creator.lastName) {
    return `${creator.firstName || ''} ${creator.lastName || ''}`.trim();
  }
  return 'Anonymous';
};

export default function LeadershipSlider({ limit = 10 }: LeadershipSliderProps) {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadPublications();
  }, [limit]);

  useEffect(() => {
    if (publications.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === publications.length - 1 ? 0 : prev + 1));
    }, 6000);

    return () => clearInterval(interval);
  }, [publications.length]);

  const loadPublications = async () => {
    try {
      setLoading(true);

      // Try cached data first
      const cachedData = getCachedData<Publication[]>(CACHE_KEYS.LEADERBOARD_PUBLICATIONS);
      if (cachedData && cachedData.length > 0) {
        setPublications(cachedData);
        setLoading(false);
      }

      // Fetch leaderboard publications
      const response = await apiClient.getLeaderboardPublications(limit);
      
      if (response.success && response.data?.posts) {
        const posts = response.data.posts;
        setPublications(posts);
        setCachedData(CACHE_KEYS.LEADERBOARD_PUBLICATIONS, posts);
      }
    } catch (error) {
      console.error('Failed to load leaderboard publications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? publications.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === publications.length - 1 ? 0 : prev + 1));
  };

  if (loading) {
    return (
      <div className="relative w-full h-[250px] md:h-[400px] overflow-hidden rounded-2xl">
        <Skeleton className="w-full h-full rounded-2xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 md:p-7">
          <div className="flex items-end justify-between gap-4">
            <div className="space-y-3 flex-1 max-w-xl">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-10 w-10/12 rounded-lg" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="w-20 h-16 rounded-lg" />
              <Skeleton className="hidden sm:block w-20 h-16 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (publications.length === 0) {
    return null;
  }

  const currentPublication = publications[currentIndex];
  
  // Get next two slides (with wrap-around)
  const getNextIndex = (index: number, offset: number) => {
    return (index + offset) % publications.length;
  };
  
  const nextSlide1 = publications[getNextIndex(currentIndex, 1)];
  const nextSlide2 = publications[getNextIndex(currentIndex, 2)];

  return (
    <div className="w-full h-full relative group">
      {/* Large Image */}
      <div className="w-full h-[250px] md:h-[400px] relative overflow-hidden">
        <img
          src={getImageUrl(currentPublication.coverImage) || getImageUrl(PLACEHOLDER_IMAGE_PATH)}
          alt={currentPublication.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Red Category Tag - Top */}
        <div className="absolute top-4 left-4 z-20">
          <span className="inline-block bg-au-red text-white text-xs font-semibold tracking-wider uppercase px-3 py-1">
            LEADERSHIP
          </span>
        </div>

        {/* Text Overlay - Bottom with Preview Cards on Right */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 text-white flex items-end justify-between">
          {/* Left side - Text content */}
          <div className="flex-1">

            {/* Title */}
            <Link href={`/publication/${currentPublication.slug}`}>
              <h2 className="text-xl lg:text-2xl font-bold mb-3 hover:text-gray-200 transition-colors max-w-full leading-tight">
                {currentPublication.title}
              </h2>
            </Link>

            {/* Author and Date */}
            <div className="flex flex-col text-sm text-gray-300">
              <span>{getAuthorName(currentPublication.creator)}</span>
              <span>{formatDate(currentPublication.publicationDate || currentPublication.createdAt)}</span>
            </div>
          </div>

          {/* Right side - Next Two Slides Preview */}
          {publications.length > 1 && (
            <div className="flex flex-row gap-2 ml-4 z-10">
              {/* Next Slide 1 */}
              {nextSlide1 && (
                <button
                  onClick={() => setCurrentIndex(getNextIndex(currentIndex, 1))}
                  className="w-24 h-16 bg-gray-900/80 hover:bg-gray-900/90 overflow-hidden cursor-pointer transition-all hover:scale-105 border-2 border-white/30 hover:border-white/50 flex-shrink-0"
                >
                  <img
                    src={getImageUrl(nextSlide1.coverImage) || getImageUrl(PLACEHOLDER_IMAGE_PATH)}
                    alt={nextSlide1.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                    }}
                  />
                </button>
              )}
              
              {/* Next Slide 2 */}
              {nextSlide2 && publications.length > 2 && (
                <button
                  onClick={() => setCurrentIndex(getNextIndex(currentIndex, 2))}
                  className="w-24 h-16 bg-gray-900/80 hover:bg-gray-900/90 overflow-hidden cursor-pointer transition-all hover:scale-105 border-2 border-white/30 hover:border-white/50 flex-shrink-0"
                >
                  <img
                    src={getImageUrl(nextSlide2.coverImage) || getImageUrl(PLACEHOLDER_IMAGE_PATH)}
                    alt={nextSlide2.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                    }}
                  />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Arrows - On Edges (Partially Transparent Circular Buttons) */}
        <button
          onClick={handlePrevious}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-30"
          aria-label="Previous"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-30"
          aria-label="Next"
        >
          <ChevronRight size={20} className="text-white" />
        </button>
      </div>
    </div>
  );
}

