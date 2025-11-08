'use client';

import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchYouTubeLiveEvents } from '@/store/youtubeSlice';
import { RootState } from '@/store';
import { Play, Calendar, Users, Clock, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getImageUrl, PLACEHOLDER_IMAGE_PATH } from '@/utils/fileUtils';
import Skeleton from './Skeleton';

interface YouTubeLiveEventsProps {
  limit?: number;
  showViewAll?: boolean;
}

export default function YouTubeLiveEvents({ limit, showViewAll = true }: YouTubeLiveEventsProps) {
  const dispatch = useDispatch();
  const { liveEvents, loading, error } = useSelector((state: RootState) => state.youtube);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    dispatch(fetchYouTubeLiveEvents() as any);
  }, [dispatch]);

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusBadge = (status: string, type: string) => {
    switch (status) {
      case 'live':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>
            LIVE
          </span>
        );
      case 'upcoming':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Calendar className="w-3 h-3 mr-1" />
            Upcoming
          </span>
        );
      case 'recent_video':
        if (type === '') {
          // Videos with "live" in title but not actually live
          return null;
        }
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Recent
          </span>
        );
      default:
        return null;
    }
  };

  if (loading && liveEvents.length === 0) {
    return (
      <div className="bg-white py-8 px-12 md:px-16 lg:px-24 xl:px-32">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-7 w-64 rounded-md" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-10 w-10 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {Array.from({ length: limit ? Math.min(limit, 3) : 3 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[300px] md:w-[350px] space-y-3">
                <div className="relative overflow-hidden rounded-xl">
                  <Skeleton className="w-full aspect-video rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                  <Skeleton className="h-3 w-1/3 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return null; // Don't show error state, fail silently
  }

  // Filter out videos with empty type (those with "live" in title but not actually live)
  const filteredEvents = liveEvents.filter(event => event.type !== '');

  if (filteredEvents.length === 0) {
    return null; // Don't show section if no events
  }

  // Limit events if limit prop is provided
  const displayEvents = limit ? filteredEvents.slice(0, limit) : filteredEvents;

  return (
    <div className="bg-white py-8 px-12 md:px-16 lg:px-24 xl:px-32">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-au-corporate-green"> Live Events</h2>
          <div className="flex items-center gap-2">
            {showViewAll && (
              <Link
                href="/live-events"
                className="text-sm md:text-base text-au-corporate-green hover:text-au-corporate-green/80 font-medium transition-colors"
              >
                View all events
              </Link>
            )}
            <button
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              className={`p-2 rounded-lg transition-colors ${
                canScrollLeft
                  ? 'bg-gray-100 hover:bg-gray-200 text-au-grey-text'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              className={`p-2 rounded-lg transition-colors ${
                canScrollRight
                  ? 'bg-gray-100 hover:bg-gray-200 text-au-grey-text'
                  : 'bg-gray-50 text-gray-300 cursor-not-allowed'
              }`}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative w-full overflow-hidden">
          <div
            ref={scrollContainerRef}
            onScroll={checkScrollability}
            className="flex gap-6 overflow-x-auto scroll-smooth pb-4 publications-carousel"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {displayEvents.map((event) => (
              <div
                key={event.id}
                className="flex-shrink-0 w-[300px] md:w-[350px]"
              >
                <div className="group relative bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 h-full">
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden bg-gray-100">
                    <img
                      src={event.thumbnailUrl}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                      }}
                    />
                    
                    {/* Status Badge Overlay */}
                    <div className="absolute top-2 left-2">
                      {getStatusBadge(event.status, event.type)}
                    </div>

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" fill="white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      <Link
                        href={`/live-events/${event.id}`}
                        className="flex items-start gap-2"
                      >
                        {event.title}
                      </Link>
                    </h3>

                    {/* Metadata */}
                    <div className="space-y-2 text-sm text-gray-600">
                      {event.status === 'live' && event.concurrentViewers !== undefined && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{event.concurrentViewers.toLocaleString()} watching</span>
                        </div>
                      )}

                      {event.viewCount !== undefined && event.status !== 'live' && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{event.viewCount.toLocaleString()} views</span>
                        </div>
                      )}

                      {event.scheduledStartTime && event.status === 'upcoming' && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Scheduled: {formatDate(event.scheduledStartTime)}</span>
                        </div>
                      )}

                      {event.actualStartTime && (event.status === 'live' || event.status === 'recent_video') && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Started: {formatDate(event.actualStartTime)}</span>
                        </div>
                      )}

                      {event.actualEndTime && event.status === 'recent_video' && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Ended: {formatDate(event.actualEndTime)}</span>
                        </div>
                      )}

                      {event.publishedAt && event.status === 'recent_video' && !event.actualStartTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>Published: {formatDate(event.publishedAt)}</span>
                        </div>
                      )}
                    </div>

                    {/* Channel */}
                    <div className="mt-3 text-sm text-gray-500">
                      {event.channelTitle}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
