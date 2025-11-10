'use client';

import { useState, KeyboardEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Search, X, Calendar, Play } from 'lucide-react';
import { cn } from '@/utils/fileUtils';
import { apiClient } from '@/utils/apiClient';
import { getImageUrl, PLACEHOLDER_IMAGE_PATH } from '@/utils/fileUtils';
import Link from 'next/link';
import { RootState } from '@/store';
import { fetchYouTubeLiveEvents } from '@/store/youtubeSlice';
import { YouTubeLiveEvent } from '@/store/youtubeSlice';

interface SearchBarProps {
  className?: string;
  popularTags?: string[];
}

interface SearchSuggestion {
  id: string;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  category?: {
    name: string;
  };
  status?: string;
  type?: 'publication' | 'live-event';
  liveEventData?: YouTubeLiveEvent;
}

export default function SearchBar({ className, popularTags }: SearchBarProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { liveEvents } = useSelector((state: RootState) => state.youtube);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Fetch live events on mount if not already loaded
  useEffect(() => {
    if (liveEvents.length === 0) {
      dispatch(fetchYouTubeLiveEvents() as any);
    }
  }, [dispatch, liveEvents.length]);

  // Default popular tags if none provided
  const defaultTags = [
    'Planner',
    'Abstracts',
    'Management',
    'Head',
    'zambia response',
    'Caf',
    'Man',
    'Coffee',
    'UNGA',
    'Rapid Response',
    'Digital Media Hub',
    'cholera',
    'Conference',
    'Briefing'
  ];

  const tags = (popularTags || defaultTags).slice(0, 10);

  // Fetch search suggestions
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    setIsLoadingSuggestions(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const query = searchQuery.trim().toLowerCase();
        const allSuggestions: SearchSuggestion[] = [];

        // Search publications
        const publicationsResponse = await apiClient.searchPublications(query, 3);
        if (publicationsResponse.success && publicationsResponse.data?.posts) {
          const publicationSuggestions = publicationsResponse.data.posts.map((post: any) => ({
            id: post.id,
            title: post.title,
            slug: post.slug,
            description: post.description,
            coverImage: post.coverImage,
            category: post.category,
            status: post.status,
            type: 'publication' as const,
          }));
          allSuggestions.push(...publicationSuggestions);
        }

        // Search live events (client-side filtering)
        const filteredLiveEvents = liveEvents
          .filter((event) => {
            if (event.type === '') return false; // Skip videos with empty type
            const titleMatch = event.title.toLowerCase().includes(query);
            const descriptionMatch = event.description?.toLowerCase().includes(query);
            return titleMatch || descriptionMatch;
          })
          .slice(0, 2) // Limit to 2 live events
          .map((event) => ({
            id: event.id,
            title: event.title,
            slug: event.id, // Use video ID as slug for live events
            description: event.description,
            coverImage: event.thumbnailUrl,
            category: { name: 'Live Event' },
            status: event.status,
            type: 'live-event' as const,
            liveEventData: event,
          }));
        allSuggestions.push(...filteredLiveEvents);

        // Limit total suggestions to 5
        setSuggestions(allSuggestions.slice(0, 5));
        setShowSuggestions(allSuggestions.length > 0);
      } catch (error) {
        console.error('Failed to fetch search suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, liveEvents]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setShowSuggestions(false);
    // Navigate to search results page with query parameter
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        const suggestion = suggestions[selectedIndex];
        if (suggestion.type === 'live-event') {
          router.push(`/live-events/${suggestion.slug}`);
        } else {
          router.push(`/publication/${suggestion.slug}`);
        }
        setShowSuggestions(false);
      } else {
        handleSearch();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(tag)}`);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'live-event') {
      router.push(`/live-events/${suggestion.slug}`);
    } else {
      router.push(`/publication/${suggestion.slug}`);
    }
    setShowSuggestions(false);
    setSearchQuery('');
  };

  const getStatusBadge = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'live-event' && suggestion.liveEventData) {
      const status = suggestion.liveEventData.status;
      const type = suggestion.liveEventData.type;
      
      if (status === 'live') {
        return (
          <div className="flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-red-600 font-medium">Live</span>
          </div>
        );
      } else if (status === 'upcoming') {
        return (
          <div className="flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">Upcoming</span>
          </div>
        );
      } else if (status === 'recent_video' && type !== '') {
        return (
          <div className="flex items-center gap-1 mt-1">
            <Play className="w-3 h-3 text-gray-600" />
            <span className="text-xs text-gray-600 font-medium">Recent</span>
          </div>
        );
      }
    } else if (suggestion.category) {
      return (
        <div className="flex items-center gap-1 mt-1">
          <span className="w-1.5 h-1.5 bg-au-green rounded-full"></span>
          <span className="text-xs text-au-green">Available</span>
        </div>
      );
    }
    return null;
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-4xl mx-auto">
        <div className="flex-1 relative" ref={searchContainerRef}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleKeyPress}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder="Search for photos, videos, documents, and more..."
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-au-corporate-green outline-none transition-colors text-sm sm:text-base"
            disabled={isSearching}
          />
          
          {/* Clear button */}
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search icon button (mobile) */}
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 sm:hidden p-2 text-gray-400 hover:text-au-corporate-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Search Suggestions Dropdown */}
          {showSuggestions && (suggestions.length > 0 || isLoadingSuggestions) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-40 max-h-96 overflow-y-auto">
              <div className="p-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-au-grey-text">Search suggestions</h3>
              </div>
              
              {isLoadingSuggestions ? (
                <div className="p-4 text-center text-sm text-gray-500">Searching...</div>
              ) : (
                <div className="py-2">
                  {suggestions.map((suggestion, index) => {
                    const isLiveEvent = suggestion.type === 'live-event';
                    const thumbnailUrl = isLiveEvent 
                      ? suggestion.coverImage 
                      : (getImageUrl(suggestion.coverImage) || getImageUrl(PLACEHOLDER_IMAGE_PATH));
                    const href = isLiveEvent 
                      ? `/live-events/${suggestion.slug}` 
                      : `/publication/${suggestion.slug}`;

                    return (
                      <Link
                        key={suggestion.id}
                        href={href}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer',
                          index === selectedIndex && 'bg-au-gold/10'
                        )}
                      >
                        {/* Thumbnail */}
                        <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-100">
                          <img
                            src={thumbnailUrl}
                            alt={suggestion.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                            }}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-au-grey-text mb-1 line-clamp-1">
                            {suggestion.title}
                          </h4>
                          {suggestion.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mb-1">
                              {suggestion.description}
                            </p>
                          )}
                          {getStatusBadge(suggestion)}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        
        <button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className={cn(
            'px-6 py-3 bg-au-corporate-green text-white rounded-lg hover:bg-au-corporate-green/90 transition-all duration-300 font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-md hover:shadow-lg',
            'min-w-[120px] sm:min-w-[140px]'
          )}
        >
          {isSearching ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="hidden sm:inline">Searching...</span>
            </>
          ) : (
            <>
              <Search className="h-5 w-5" />
              <span>Search</span>
            </>
          )}
        </button>
      </div>

      {/* Popular Tags 
      {tags.length > 0 && !showSuggestions && (
        <div className="mt-4 max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
            {tags.map((tag, index) => (
              <button
                key={index}
                onClick={() => handleTagClick(tag)}
                className="px-2 py-1 text-xs text-au-grey-text bg-white border border-gray-300 rounded hover:border-au-gold hover:text-au-gold hover:bg-au-gold/10 transition-all duration-300 hover:scale-105"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}*/}
    </div>
  );
}
