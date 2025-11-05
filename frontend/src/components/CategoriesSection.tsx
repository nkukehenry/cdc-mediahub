'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '@/utils/apiClient';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/utils/cacheUtils';

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

  const getCoverImageUrl = (coverImage?: string) => {
    if (!coverImage) return '/uploads/placeholder-image.jpg';
    if (coverImage.startsWith('http')) return coverImage;
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/${coverImage}`;
  };

  // Button colors for different categories (can be customized)
  const getButtonColor = (index: number) => {
    const colors = [
      'bg-gray-700', // Photos - dark grey
      'bg-green-600', // Audios - green
      'bg-red-600', // Videos - red
      'bg-green-600', // Documents - green
      'bg-yellow-500', // Infographics - golden/yellowish
      'bg-green-600', // Live Events - green
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="bg-white py-4 px-12 md:px-16 lg:px-24 xl:px-32">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <h2 className="text-lg md:text-xl font-bold text-au-grey-text mb-3">
                Browse Categories
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-200 overflow-hidden animate-pulse aspect-[2/1]">
                    <div className="w-full h-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-gray-200 rounded-lg p-4 h-40 animate-pulse" />
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
    <div className="bg-white py-4 px-12 md:px-16 lg:px-24 xl:px-32">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Browse Categories Section */}
          <div className="lg:col-span-2">
            <h2 className="text-lg md:text-xl font-bold text-au-grey-text mb-3">
              Browse Categories
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
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
                    src={getCoverImageUrl(category.coverImage)}
                    alt={category.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/placeholder-image.jpg';
                    }}
                  />
                  
                  {/* Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/60" />
                  
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

          {/* Follow us on YouTube Section */}
          <div className="lg:col-span-1">
            <h2 className="text-lg md:text-xl font-bold text-au-grey-text mb-3">
              Follow us on YouTube
            </h2>
            <div className="bg-gray-50 rounded-lg p-3 md:p-4">
              <p className="text-xs text-au-grey-text/70 mb-3">
                No live events loaded yet
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
          </div>
        </div>
      </div>
    </div>
  );
}

