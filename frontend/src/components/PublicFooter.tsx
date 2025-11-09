'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';
import { apiClient } from '@/utils/apiClient';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/utils/cacheUtils';
import { RootState } from '@/store';
import { fetchPublicSettings } from '@/store/settingsSlice';
import { getImageUrl, PLACEHOLDER_IMAGE_PATH } from '@/utils/fileUtils';

interface Category {
  id: string;
  name: string;
  slug: string;
  showOnMenu?: boolean;
  menuOrder?: number;
}

export default function PublicFooter() {
  const dispatch = useDispatch();
  const { settings } = useSelector((state: RootState) => state.settings);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
    dispatch(fetchPublicSettings() as any);
  }, [dispatch]);

  const loadCategories = async () => {
    try {
      setLoading(true);

      // Try to get cached data first
      const cachedData = getCachedData<Category[]>(CACHE_KEYS.CATEGORIES);
      if (cachedData && cachedData.length > 0) {
        setCategories(cachedData);
        setLoading(false);
      }

      // Always fetch fresh data in background
      const response = await apiClient.getCategories();
      if (response.success && response.data?.categories) {
        // Filter categories that should be displayed (or show all if no filter)
        const visibleCategories = response.data.categories
          .filter((cat: Category) => cat.showOnMenu !== false)
          .sort((a: Category, b: Category) => (a.menuOrder || 0) - (b.menuOrder || 0));

        setCategories(visibleCategories);
        setCachedData(CACHE_KEYS.CATEGORIES, visibleCategories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Build social links from settings, with fallback to hardcoded values
  const socialLinks = [
    { icon: Twitter, href: settings?.social?.twitter || 'https://twitter.com/AfricaCDC', label: 'Twitter', key: 'twitter' },
    { icon: Linkedin, href: settings?.social?.linkedin || 'https://www.linkedin.com/company/africacdc/', label: 'LinkedIn', key: 'linkedin' },
    { icon: Facebook, href: settings?.social?.facebook || 'https://web.facebook.com/africacdc/', label: 'Facebook', key: 'facebook' },
    { icon: Youtube, href: settings?.social?.youtube || 'https://www.youtube.com/channel/UCWRIrWg4as6umiFK_k80pIg', label: 'YouTube', key: 'youtube' },
    { icon: Instagram, href: settings?.social?.instagram || 'https://www.instagram.com/africacdc/', label: 'Instagram', key: 'instagram' },
  ].filter(link => link.href); // Filter out empty links

  // Flickr icon as SVG since it's not in lucide-react
  const FlickrIcon = () => (
    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 8.5c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5zm9 0c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5z"/>
    </svg>
  );

  return (
    <footer className="bg-gray-800 text-white py-12 px-6 md:px-16 lg:px-24 xl:px-32 border-t-4 border-au-red">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Column - Logo and Description */}
          <div className="flex flex-col">
            {/* Logo */}
            <div className="flex items-center mb-4">
              {settings?.logo ? (
                <img 
                  src={getImageUrl(settings.logo)} 
                  alt={settings?.site?.name || 'Site Logo'} 
                  className="h-12 md:h-16 w-auto mr-3 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes(PLACEHOLDER_IMAGE_PATH)) {
                      target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                    }
                  }}
                />
              ) : (
                <img 
                  src="./logo.png" 
                  alt="Site Logo" 
                  className="h-12 md:h-16 w-auto mr-3"
                />
              )}
            </div>
            
            {/* Descriptive Text */}
            <p className="text-gray-300 font-semibold text-sm md:text-base">
              {settings?.site?.name || settings?.site?.tagline || 'Africa CDC Digital Media Hub (DMH)'}
            </p>
            {settings?.site?.description && (
              <p className="text-gray-400 text-xs mt-2">
                {settings.site.description}
              </p>
            )}
          </div>

          {/* Middle Column - Social Media */}
          <div className="flex flex-col">
            <h3 className="text-white font-bold text-sm md:text-base mb-4 uppercase tracking-wide">
              SOCIAL MEDIA
            </h3>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.key}
                    href={social.href}
                    aria-label={social.label}
                    className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-md flex items-center justify-center transition-colors duration-200"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </a>
                );
              })}
              {/* Flickr Link */}
              <a
                href="https://www.flickr.com/photos/africacdc/albums/"
                aria-label="Flickr"
                className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-md flex items-center justify-center transition-colors duration-200"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FlickrIcon />
              </a>
            </div>
          </div>

          {/* Right Column - Category Links */}
          <div className="flex flex-col">
            <h3 className="text-white font-bold text-sm md:text-base mb-3 uppercase tracking-wide">
              CATEGORIES
            </h3>
            {loading ? (
              <div className="flex flex-wrap gap-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            ) : categories.length > 0 ? (
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="text-gray-300 hover:text-white text-[10px] md:text-xs transition-colors duration-200 whitespace-nowrap"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-[10px] md:text-xs">No categories available</p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

