'use client';

import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { apiClient } from '@/utils/apiClient';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/utils/cacheUtils';
import { getImageUrl, PLACEHOLDER_IMAGE_PATH } from '@/utils/fileUtils';
import { fetchYouTubeLiveEvents } from '@/store/youtubeSlice';
import { RootState } from '@/store';
import { Play, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { YouTubeLiveEvent } from '@/store/youtubeSlice';
import Skeleton from './Skeleton';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  coverImage?: string;
  showOnMenu?: boolean;
  menuOrder?: number;
}

interface CategoryWithCount extends Category {
  publicationCount?: number;
}

export default function CategoriesSection() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);

      // Try to get cached data first
      const cachedData = getCachedData<CategoryWithCount[]>(CACHE_KEYS.CATEGORIES);
      if (cachedData && cachedData.length > 0) {
        setCategories(cachedData);
        setLoading(false);
      }

      // Always fetch fresh data in background
      const response = await apiClient.getCategories();
      if (response.success && response.data?.categories) {
        // Filter categories that should be displayed (or show all if no filter)
        const visibleCategories = response.data.categories.filter(
          cat => cat.showOnMenu !== false
        ).sort((a, b) => (a.menuOrder || 0) - (b.menuOrder || 0));

        // Optionally fetch publication counts for each category
        const categoriesWithCounts = await Promise.all(
          visibleCategories.map(async (category) => {
            try {
              // Get publications count for this category
              const pubResponse = await apiClient.getPublicPublications({
                categoryId: category.id,
                limit: 1,
              });
              const count = pubResponse.success && pubResponse.data?.posts 
                ? pubResponse.data.posts.length 
                : 0;
              
              // For a more accurate count, we'd need a count endpoint
              // For now, we'll use a placeholder or fetch more publications
              return {
                ...category,
                publicationCount: undefined, // Will be shown as empty for now
              };
            } catch (error) {
              console.error(`Error loading count for category ${category.id}:`, error);
              return {
                ...category,
                publicationCount: undefined,
              };
            }
          })
        );

        setCategories(categoriesWithCounts);
        setCachedData(CACHE_KEYS.CATEGORIES, categoriesWithCounts);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };


  // Button colors for different categories - balanced AU colors
  const getButtonColor = (index: number) => {
    const colors = [
      'bg-au-corporate-green', // Photos - dark green
      'bg-au-green', // Audios - lighter green
      'bg-au-red', // Videos - red
      'bg-au-gold', // Documents - gold
      'bg-au-corporate-green', // Infographics - dark green
      'bg-au-green', // Live Events - lighter green
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="bg-white py-4 px-6 md:px-16 lg:px-24 xl:px-32">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-6 w-48 rounded-md" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="relative aspect-[2/1] overflow-hidden rounded-xl">
                    <Skeleton className="absolute inset-0 rounded-xl" />
                    <div className="absolute inset-0 p-3 flex flex-col justify-between pointer-events-none">
                      <Skeleton className="h-4 w-3/4 rounded-md" />
                      <Skeleton className="h-3 w-1/2 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-1 space-y-3">
              <Skeleton className="h-5 w-32 rounded-md" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="relative overflow-hidden rounded-lg">
                    <Skeleton className="w-full aspect-video rounded-lg" />
                    <div className="absolute inset-0 p-3 flex flex-col justify-end pointer-events-none space-y-2">
                      <Skeleton className="h-4 w-2/3 rounded-md" />
                      <Skeleton className="h-3 w-1/2 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="bg-white py-4 px-6 md:px-16 lg:px-24 xl:px-32">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Browse Categories Section */}
          <div className="lg:col-span-2">
            <h2 className="text-lg md:text-xl font-bold text-au-grey-text mb-3">
              Browse Categories
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-2.5">
              {categories.slice(0, 6).map((category, index) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="group relative overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 aspect-[2/1] animate-fade-in"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    animationFillMode: 'both'
                  }}
                >
                  {/* Background Image */}
                  <img
                    src={getImageUrl(category.coverImage) || getImageUrl(PLACEHOLDER_IMAGE_PATH)}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                    }}
                  />
                  
                  {/* Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-black/10 to-black/15" />
                  
                  {/* Content Overlay */}
                  <div className="absolute inset-0 flex flex-col p-2.5 md:p-3">
                    {/* Category Name - positioned at top */}
                    <h3 className="text-base md:text-lg font-bold text-white">
                      {category.name}
                    </h3>
                    
                    {/* View Button - positioned below category name */}
                    <button
                      className={`${getButtonColor(index)} text-white px-2.5 py-1 rounded-lg text-xs font-medium w-fit mt-2 hover:opacity-90 transition-all duration-300 group-hover:translate-x-1`}
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/category/${category.slug}`;
                      }}
                    >
                      View →
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Live Events Section */}
          <div className="lg:col-span-1">
            <h2 className="text-sm md:text-base font-semibold text-au-grey-text mb-3">
              Live Events
            </h2>
            <YouTubeLiveEventsCarousel />
          </div>
        </div>
      </div>
    </div>
  );
}

function YouTubeLiveEventsCarousel() {
  const dispatch = useDispatch();
  const { liveEvents, loading: youtubeLoading } = useSelector((state: RootState) => state.youtube);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    if (liveEvents.length === 0) {
      dispatch(fetchYouTubeLiveEvents() as any);
    }
  }, [dispatch, liveEvents.length]);

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScrollability();
    const timer = setTimeout(checkScrollability, 100);
    const resizeObserver = new ResizeObserver(() => {
      checkScrollability();
    });
    
    if (scrollContainerRef.current) {
      resizeObserver.observe(scrollContainerRef.current);
    }
    
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [liveEvents]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8;
    const scrollTo = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount;
    
    container.scrollTo({
      left: scrollTo,
      behavior: 'smooth'
    });
  };

  const getStatusBadge = (status: YouTubeLiveEvent['status'], type: YouTubeLiveEvent['type']) => {
    switch (status) {
      case 'live':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800 animate-pulse">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></span>
            LIVE
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
            <Calendar className="w-2.5 h-2.5 mr-0.5" />
            Upcoming
          </span>
        );
      case 'recent_video':
        if (type === '') {
          return null;
        }
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800">
            Recent
          </span>
        );
      default:
        return null;
    }
  };

  const handleSubscribeClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();

    if (typeof window !== 'undefined') {
      window.open('https://www.youtube.com/@AfricaCDC', '_blank', 'noopener,noreferrer');
    }
  };

  // Filter and sort events: upcoming first, then live, then recent
  const filteredEvents = liveEvents.filter(event => event.type !== '');
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
    if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
    if (a.status === 'live' && b.status === 'recent_video') return -1;
    if (a.status === 'recent_video' && b.status === 'live') return 1;
    return 0;
  });

  const displayEvents = sortedEvents.slice(0, 5); // Show max 5 events

  if (youtubeLoading && displayEvents.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 md:p-4">
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="relative overflow-hidden rounded-lg">
              <Skeleton className="w-full aspect-video rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (displayEvents.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 md:p-4">
        <p className="text-xs text-au-grey-text/70 mb-3">
          No live events available
        </p>
        <a
          href="https://www.youtube.com/@AfricaCDC"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          <span>Subscribe to Channel</span>
        </a>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 md:p-4">
      {/* Scroll Controls */}
      {displayEvents.length > 1 && (
        <div className="flex items-center justify-end gap-1 mb-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={`p-1 rounded transition-colors ${
              canScrollLeft
                ? 'bg-gray-200 hover:bg-gray-300 text-au-grey-text'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={`p-1 rounded transition-colors ${
              canScrollRight
                ? 'bg-gray-200 hover:bg-gray-300 text-au-grey-text'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Carousel */}
      <div className="relative w-full overflow-hidden">
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollability}
          className="flex gap-3 overflow-x-auto scroll-smooth pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {displayEvents.map((event) => (
            <div
              key={event.id}
              className="flex-shrink-0 w-full"
            >
              <Link
                href={`/live-events/${event.id}`}
                className="block group"
              >
                <div className="relative aspect-video overflow-hidden bg-gray-200 rounded-lg">
                  <img
                    src={event.thumbnailUrl}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                    }}
                  />
                  
                  {/* Status Badge */}
                  <div className="absolute top-1.5 left-1.5">
                    {getStatusBadge(event.status, event.type)}
                  </div>

                  {/* Subscribe Button Overlay - Top Right */}
                  <div className="absolute top-1.5 right-1.5">
                    <button
                      type="button"
                      onClick={handleSubscribeClick}
                      className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-medium transition-colors shadow-lg"
                      aria-label="Subscribe to YouTube"
                    >
                      <svg
                        className="w-2.5 h-2.5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                      <span className="hidden sm:inline">Subscribe</span>
                    </button>
                  </div>

                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Play className="w-8 h-8 text-white" fill="white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xs font-semibold text-au-grey-text mt-2 line-clamp-2 group-hover:text-au-corporate-green transition-colors">
                  {event.title}
                </h3>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

