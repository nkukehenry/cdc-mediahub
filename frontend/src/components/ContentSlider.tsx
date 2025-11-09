"use client";

import { useState, useEffect, useRef, TouchEvent, MouseEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl, PLACEHOLDER_IMAGE_PATH, truncateText } from "@/utils/fileUtils";

interface Publication {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  slug: string;
  badgeLabel?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  publicationDate?: string;
  createdAt?: string;
  views?: number;
  uniqueHits?: number;
}

const isVideoCategory = (categoryName?: string): boolean => {
  if (!categoryName) return false;
  const name = categoryName.toLowerCase();
  return name.includes('video');
};


interface ContentSliderProps {
  publications: Publication[];
  title: string;
  badgeLabel?: string;
  className?: string;
}

export default function ContentSlider({ publications, title, badgeLabel, className }: ContentSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  useEffect(() => {
    if (isPaused || publications.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev === publications.length - 1 ? 0 : prev + 1));
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, publications.length]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? publications.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === publications.length - 1 ? 0 : prev + 1));
  };

  // Touch handlers
  const onTouchStart = (e: TouchEvent) => {
    setIsPaused(true);
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsPaused(false);
      return;
    }
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNext();
    }
    if (isRightSwipe) {
      handlePrevious();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
    setTimeout(() => setIsPaused(false), 1000);
  };

  // Mouse drag handlers
  const onMouseDown = (e: MouseEvent) => {
    setIsPaused(true);
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDragging || dragStart === null) return;
    // Prevent text selection while dragging
    e.preventDefault();
  };

  const onMouseUp = (e: MouseEvent) => {
    if (!dragStart) {
      setIsDragging(false);
      setIsPaused(false);
      return;
    }
    const distance = dragStart - e.clientX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNext();
    }
    if (isRightSwipe) {
      handlePrevious();
    }
    
    setDragStart(null);
    setIsDragging(false);
    setTimeout(() => setIsPaused(false), 1000);
  };

  const onMouseLeave = () => {
    setDragStart(null);
    setIsDragging(false);
    setIsPaused(false);
  };

  const getVisiblePublications = () => {
    if (publications.length === 0) return [];
    // Get previous 2 items
    const prev2 = currentIndex - 2 < 0 ? publications.length + (currentIndex - 2) : currentIndex - 2;
    const prev1 = currentIndex - 1 < 0 ? publications.length - 1 : currentIndex - 1;
    // Get next 2 items
    const next1 = currentIndex + 1 >= publications.length ? 0 : currentIndex + 1;
    const next2 = currentIndex + 2 >= publications.length ? (currentIndex + 2) - publications.length : currentIndex + 2;
    return [prev2, prev1, currentIndex, next1, next2];
  };

  const visibleIndices = getVisiblePublications();

  if (publications.length === 0) {
    return null;
  }

  const getOpacity = (position: number) => {
    return 1; // All items fully opaque
  };

  const getScale = (position: number) => {
    if (position === 2) return 1; // Center
    if (position === 1 || position === 3) return 0.8; // Adjacent to center
    return 0.55; // Furthest
  };

  const getTranslateX = (position: number) => {
    if (position === 2) return 0; // Center
    if (position === 0) return -400; // Furthest left
    if (position === 1) return -200; // Near left
    if (position === 3) return 200; // Near right
    return 400; // Furthest right
  };

  const getRotateY = (position: number) => {
    return 0; // No rotation - cards stay flat on the sides
  };

  return (
    <div
      className={`w-full max-w-7xl mx-auto relative ${className || ''}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={onMouseLeave}
    >
      <div className="relative flex items-center justify-center px-16">
        {/* Previous Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          className="absolute left-0 z-20 h-12 w-12 rounded-full bg-white shadow-lg hover:bg-gray-100 hover:shadow-xl transition-all duration-200 border border-gray-200"
        >
          <ChevronLeft className="h-6 w-6 text-gray-800" />
        </Button>

        <div
          ref={carouselRef}
          className="relative w-full h-[400px] flex items-center justify-center"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          style={{ userSelect: isDragging ? 'none' : 'auto', cursor: isDragging ? 'grabbing' : 'grab', perspective: '1000px' }}
        >
          {visibleIndices.map((pubIndex, position) => {
            const publication = publications[pubIndex];
            const isCenter = position === 2;

            return (
              <div
                key={`${publication.id}-${position}`}
                className="absolute transition-all duration-700 ease-in-out"
                style={{
                  width: "700px", // Consistent base width for all items
                  transform: `translateX(${getTranslateX(position)}px) scale(${getScale(position)}) perspective(1000px) rotateY(${getRotateY(position)}deg)`,
                  opacity: getOpacity(position),
                  zIndex: 10 - Math.abs(position - 2),
                  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                  transformStyle: "preserve-3d",
                }}
              >
                <Link href={`/publication/${publication.slug}`} className="pointer-events-auto">
                  <div
                    className={`bg-card rounded-xl overflow-hidden shadow-lg transition-all duration-700 ${
                      isCenter ? "shadow-2xl hover:scale-105" : "shadow-md"
                    }`}
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={getImageUrl(publication.coverImage) || getImageUrl(PLACEHOLDER_IMAGE_PATH)}
                        alt={publication.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                        }}
                      />

                      {/* Small Badge - Top Left Corner */}
                      {(publication.badgeLabel || badgeLabel) && (
                        <div className="absolute top-4 left-4 z-10">
                          <span className="bg-black/80 text-white px-3 py-1 rounded text-xs font-semibold uppercase tracking-wide">
                            {publication.badgeLabel || badgeLabel}
                          </span>
                        </div>
                      )}

                      {/* Play Button - Only for videos */}
                      {isVideoCategory(publication.category?.name) && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg">
                            <Play className="h-8 w-8 text-gray-800 ml-1 hover:scale-110 transition-transform duration-300" fill="currentColor" />
                          </div>
                        </div>
                      )}

                      {isCenter && (
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/30 via-black/50 to-transparent p-6 pt-16">
                          <h2 className="text-2xl font-bold text-white mb-2 text-balance">
                            {truncateText(publication.title, 50) || "Untitled Publication"}
                          </h2>
                          {publication.description && (
                            <p className="text-sm text-white/90 leading-relaxed text-pretty">{publication.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Next Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="absolute right-0 z-20 h-12 w-12 rounded-full bg-white shadow-lg hover:bg-gray-100 hover:shadow-xl transition-all duration-200 border border-gray-200"
        >
          <ChevronRight className="h-6 w-6 text-gray-800" />
        </Button>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {publications.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentIndex ? "w-8 bg-gray-900" : "w-2 bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
