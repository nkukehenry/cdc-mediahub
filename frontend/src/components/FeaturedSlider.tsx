'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/utils/apiClient';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/utils/cacheUtils';

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

interface FeaturedSliderProps {
  limit?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getCoverImageUrl = (coverImage?: string) => {
  if (!coverImage) return 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=800&fit=crop';
  if (coverImage.startsWith('http')) return coverImage;
  return `${API_BASE_URL}/${coverImage}`;
};

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

export default function FeaturedSlider({ limit = 10 }: FeaturedSliderProps) {
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
      const cachedData = getCachedData<Publication[]>(CACHE_KEYS.FEATURED_PUBLICATIONS);
      if (cachedData && cachedData.length > 0) {
        setPublications(cachedData);
        setLoading(false);
      }

      // Fetch featured publications
      const response = await apiClient.getFeaturedPublications(limit);
      
      if (response.success && response.data?.posts) {
        const posts = response.data.posts;
        setPublications(posts);
        setCachedData(CACHE_KEYS.FEATURED_PUBLICATIONS, posts);
      }
    } catch (error) {
      console.error('Failed to load featured publications:', error);
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
      <div className="w-full h-[250px] md:h-[400px] bg-gray-200 animate-pulse relative" />
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
          src={getCoverImageUrl(currentPublication.coverImage)}
          alt={currentPublication.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=1200&h=800&fit=crop';
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Text Overlay - Bottom with Preview Cards on Right */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 text-white flex items-end justify-between">
          {/* Left side - Text content */}
          <div className="flex-1">
            {/* Red Category Tag */}
            <div className="mb-3">
              <span className="inline-block bg-red-600 text-white text-xs font-semibold tracking-wider uppercase px-3 py-1">
                {currentPublication.category?.name?.toUpperCase() || 'FEATURED'}
              </span>
            </div>

            {/* Title */}
            <Link href={`/publications/${currentPublication.slug}`}>
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
                    src={getCoverImageUrl(nextSlide1.coverImage)}
                    alt={nextSlide1.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=200&h=300&fit=crop';
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
                    src={getCoverImageUrl(nextSlide2.coverImage)}
                    alt={nextSlide2.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=200&h=300&fit=crop';
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
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20"
          aria-label="Previous"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20"
          aria-label="Next"
        >
          <ChevronRight size={20} className="text-white" />
        </button>
      </div>
    </div>
  );
}

