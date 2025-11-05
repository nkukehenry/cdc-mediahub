'use client';

import { useState, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/utils/fileUtils';

interface SearchBarProps {
  className?: string;
  popularTags?: string[];
}

export default function SearchBar({ className, popularTags }: SearchBarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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

  const tags = popularTags || defaultTags;

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    // Navigate to search results page with query parameter
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    router.push(`/search?q=${encodeURIComponent(tag)}`);
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search for photos, videos, documents, and more..."
            className="w-full px-4 py-3 pr-12 sm:pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-au-corporate-green focus:border-au-corporate-green outline-none transition-colors text-sm sm:text-base"
            disabled={isSearching}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 sm:hidden p-2 text-gray-400 hover:text-au-corporate-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
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

      {/* Popular Tags */}
      {tags.length > 0 && (
        <div className="mt-4 max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
            {tags.map((tag, index) => (
              <button
                key={index}
                onClick={() => handleTagClick(tag)}
                className="px-2 py-1 text-xs text-au-grey-text bg-white border border-gray-300 rounded hover:border-au-corporate-green hover:text-au-corporate-green hover:bg-au-gold/5 transition-all duration-300 hover:scale-105"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
