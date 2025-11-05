'use client';

import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Publication } from '@/store/publicationsSlice';
import PublicationCard from './PublicationCard';

interface PublicationsCarouselProps {
  publications: Publication[];
  title?: string;
}

export default function PublicationsCarousel({ publications, title = 'Related Publications' }: PublicationsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollability = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  // Check scrollability on mount and when publications change
  useEffect(() => {
    checkScrollability();
    // Also check after a short delay to ensure DOM is fully rendered
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
  }, [publications]);

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

  if (!publications || publications.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-au-corporate-green">
          {title.toUpperCase()}
        </h2>
        <div className="flex items-center gap-2">
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
      <div className="relative w-full overflow-hidden" style={{ minHeight: '300px' }}>
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollability}
          className="flex gap-4 overflow-x-auto scroll-smooth pb-4 publications-carousel"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            minHeight: '300px',
            height: 'auto',
          }}
        >
          {publications.map((publication) => (
            <div key={publication.id} className="flex-shrink-0 w-[300px] md:w-[350px]" style={{ height: '200px', minHeight: '200px' }}>
              <PublicationCard publication={publication} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

