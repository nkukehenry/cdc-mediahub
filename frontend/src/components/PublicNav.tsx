'use client';

import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Menu, X, User, LogOut, LayoutDashboard, FileText, Folder } from 'lucide-react';
import { cn } from '@/utils/fileUtils';
import { apiClient } from '@/utils/apiClient';
import { useAuth } from '@/hooks/useAuth';
import LanguageSelector from './LanguageSelector';
import { RootState } from '@/store';
import { fetchNavLinks } from '@/store/navLinksSlice';
import { fetchPublicSettings } from '@/store/settingsSlice';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/utils/cacheUtils';
import { getImageUrl, PLACEHOLDER_IMAGE_PATH, truncateText } from '@/utils/fileUtils';

interface Category {
  id: string;
  name: string;
  slug: string;
  showOnMenu?: boolean;
  menuOrder?: number;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
}

interface Publication {
  id: string;
  title: string;
  slug: string;
  coverImage?: string;
}

interface CategoryWithData extends Category {
  subcategories: Subcategory[];
  publications: Publication[];
}

export default function PublicNav() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, logout } = useAuth();
  const { navLinks } = useSelector((state: RootState) => state.navLinks);
  const { settings } = useSelector((state: RootState) => state.settings);
  const [categories, setCategories] = useState<CategoryWithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMegaMenu, setOpenMegaMenu] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTopUserMenu, setShowTopUserMenu] = useState(false);
  const [hoveredSubcategory, setHoveredSubcategory] = useState<{ categoryId: string; subcategoryId: string } | null>(null);
  const [filteredPublications, setFilteredPublications] = useState<Map<string, Publication[]>>(new Map());
  const [tooltipPosition, setTooltipPosition] = useState<number>(0.5); // Position as a percentage (0 to 1)
  const megaMenuRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const navLinkRefs = useRef<Map<string, HTMLElement>>(new Map());
  const userMenuRef = useRef<HTMLDivElement>(null);
  const topUserMenuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadCategories();
    dispatch(fetchNavLinks() as any);
    dispatch(fetchPublicSettings() as any);
  }, [dispatch]);

  // Close mega menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      let clickedOutside = true;

      megaMenuRefs.current.forEach((menu) => {
        if (menu && menu.contains(target)) {
          clickedOutside = false;
        }
      });

      if (clickedOutside) {
        setOpenMegaMenu(null);
      }
    };

    if (openMegaMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMegaMenu]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (topUserMenuRef.current && !topUserMenuRef.current.contains(event.target as Node)) {
        setShowTopUserMenu(false);
      }
    };

    if (showUserMenu || showTopUserMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserMenu, showTopUserMenu]);

  const handleLogout = async () => {
    logout();
    // Ensure we redirect to home page
    window.location.href = '/';
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      
      // Try to get cached data first
      const cachedData = getCachedData<CategoryWithData[]>(CACHE_KEYS.PUBLICATIONS_MENU);
      if (cachedData && cachedData.length > 0) {
        setCategories(cachedData);
        setLoading(false);
      }

      // Always fetch fresh data in background
      const categoriesRes = await apiClient.getCategories();
      if (!categoriesRes.success || !categoriesRes.data?.categories) {
        return;
      }

      // Filter categories that should show on menu and sort by menuOrder
      const menuCategories = categoriesRes.data.categories
        .filter(cat => cat.showOnMenu !== false)
        .sort((a, b) => (a.menuOrder || 0) - (b.menuOrder || 0));

      // Load subcategories and publications for each category
      const categoriesWithData = await Promise.all(
        menuCategories.map(async (category) => {
          try {
            // Get subcategories
            const subcategoriesRes = await apiClient.getCategorySubcategories(category.id);
            const subcategories = subcategoriesRes.success && subcategoriesRes.data?.subcategories
              ? subcategoriesRes.data.subcategories
              : [];

            // Get last 5 publications for this category
            const publicationsRes = await apiClient.getPublicPublications({
              categoryId: category.id,
              limit: 5,
            });
            const publications = publicationsRes.success && publicationsRes.data?.posts
              ? publicationsRes.data.posts.slice(0, 5)
              : [];

            return {
              ...category,
              subcategories,
              publications,
            };
          } catch (error) {
            console.error(`Error loading data for category ${category.id}:`, error);
            return {
              ...category,
              subcategories: [],
              publications: [],
            };
          }
        })
      );

      setCategories(categoriesWithData);
      // Cache the fresh data
      setCachedData(CACHE_KEYS.PUBLICATIONS_MENU, categoriesWithData);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMegaMenuEnter = (categoryId: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Calculate tooltip position based on nav link position
    const navLink = navLinkRefs.current.get(categoryId);
    if (navLink) {
      const rect = navLink.getBoundingClientRect();
      const menuWidth = 600; // Base menu width
      const navLinkCenterX = rect.left + rect.width / 2;
      const viewportCenterX = window.innerWidth / 2;
      // Calculate how far the nav link is from the center as a percentage
      const offset = (navLinkCenterX - viewportCenterX) / menuWidth;
      // Clamp between 0.2 and 0.8 to keep tooltip visible
      setTooltipPosition(Math.max(0.2, Math.min(0.8, 0.5 + offset)));
    }
    
    setOpenMegaMenu(categoryId);
  };

  const handleMegaMenuLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpenMegaMenu(null);
      setHoveredSubcategory(null);
    }, 200);
  };

  const handleSubcategoryHover = async (categoryId: string, subcategoryId: string) => {
    console.log('Hovering subcategory:', subcategoryId, 'in category:', categoryId);
    setHoveredSubcategory({ categoryId, subcategoryId });
    
    // Check if we already have filtered publications for this subcategory
    const cacheKey = `${categoryId}-${subcategoryId}`;
    if (filteredPublications.has(cacheKey)) {
      console.log('Using cached publications for:', cacheKey);
      return;
    }

    // Fetch publications for this subcategory
    try {
      console.log('Fetching publications for subcategory:', subcategoryId);
      const publicationsRes = await apiClient.getPublicPublications({
        subcategoryId,
        limit: 5,
      });
      console.log('Publications response:', publicationsRes);
      const publications = publicationsRes.success && publicationsRes.data?.posts
        ? publicationsRes.data.posts.slice(0, 5)
        : [];
      
      console.log('Setting filtered publications:', publications.length, 'publications');
      setFilteredPublications(prev => {
        const newMap = new Map(prev);
        newMap.set(cacheKey, publications);
        return newMap;
      });
    } catch (error) {
      console.error(`Error loading publications for subcategory ${subcategoryId}:`, error);
      setFilteredPublications(prev => {
        const newMap = new Map(prev);
        newMap.set(cacheKey, []);
        return newMap;
      });
    }
  };

  const handleSubcategoryLeave = () => {
    // Small delay before clearing to allow moving to publications
    // The publications section will maintain the hover state
  };

  const setMegaMenuRef = (categoryId: string, element: HTMLDivElement | null) => {
    if (element) {
      megaMenuRefs.current.set(categoryId, element);
    } else {
      megaMenuRefs.current.delete(categoryId);
    }
  };


  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  return (
    <>
      <nav className="bg-white sticky top-0 z-50 shadow-md border-b border-gray-200">
        {/* Top Utility Bar */}
        <div className="bg-au-corporate-green">
          <div className="container mx-auto px-12 md:px-16 lg:px-24 xl:px-32">
            <div className="flex items-center justify-between h-10 text-sm">
              {/* Left - Utility Links */}
              <div className="flex items-center gap-3 md:gap-4 lg:gap-6 overflow-x-auto">
                {navLinks.map((link) => {
                  // Determine visibility classes based on order
                  let visibilityClass = '';
                  if (link.order === 2) visibilityClass = 'hidden sm:inline'; // Sitemap
                  if (link.order === 5) visibilityClass = 'hidden md:inline'; // Knowledge Portal
                  if (link.order === 6) visibilityClass = 'hidden lg:inline'; // Tutorials
                  if (link.order === 7) visibilityClass = 'hidden md:inline'; // FAQs
                  if (link.order === 8) visibilityClass = 'hidden sm:inline'; // Help

                  const href = link.external ? link.url : link.route;
                  return href ? (
                    <Link 
                      key={link.id} 
                      href={href} 
                      className={cn("text-white/90 hover:text-white transition-colors whitespace-nowrap text-xs md:text-sm", visibilityClass)}
                      {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {link.label}
                    </Link>
                  ) : null;
                })}
              </div>

              {/* Right - Language Selector & Login/Register */}
              <div className="flex items-center gap-3 md:gap-4">
                <LanguageSelector />
                {user && (
                  <div className="hidden md:flex items-center gap-2">
                    <Link
                      href="/my/publications"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white/90 border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <FileText size={14} />
                      My Publications
                    </Link>
                    <Link
                      href="/my/files"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white/90 border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Folder size={14} />
                      My Files
                    </Link>
                  </div>
                )}
                {user ? (
                  <div className="relative" ref={topUserMenuRef}>
                    <button
                      onClick={() => setShowTopUserMenu(!showTopUserMenu)}
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-medium text-xs md:text-sm border border-white/30 shadow-sm">
                        {user?.firstName?.[0] || user?.username?.[0] || 'U'}
                      </div>
                      <ChevronDown className={cn('h-4 w-4 text-white/90 transition-transform', showTopUserMenu && 'rotate-180')} />
                    </button>
                    {showTopUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <div className="px-4 py-2 border-b border-gray-200">
                          <p className="text-sm font-medium text-au-grey-text">{user?.firstName || user?.username}</p>
                          <p className="text-xs text-au-grey-text/70">{user?.email}</p>
                        </div>
                        <Link
                          href="/profile"
                          onClick={() => setShowTopUserMenu(false)}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-au-grey-text hover:bg-au-gold/10 transition-colors"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Link>
                        {user?.isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setShowTopUserMenu(false)}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-au-grey-text hover:bg-au-gold/10 transition-colors"
                          >
                            <LayoutDashboard className="h-4 w-4 mr-2" />
                            Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            handleLogout();
                            setShowTopUserMenu(false);
                          }}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-au-red hover:bg-au-red/10 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link href="/login" className="text-white/90 hover:text-white transition-colors text-xs md:text-sm">
                      Login
                    </Link>
                    <span className="text-white/70">/</span>
                    <Link href="/register" className="text-white/90 hover:text-white transition-colors text-xs md:text-sm">
                      Register
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation Bar */}
        <div className="bg-white">
          <div className="container mx-auto px-12 md:px-16 lg:px-24 xl:px-32">
            <div className="flex items-center h-16">
              {/* Left - Logo */}
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="flex items-center">
                  <div className="flex items-center justify-center">
                    {settings?.logo ? (
                      <img 
                        src={getImageUrl(settings.logo)} 
                        alt={settings?.site?.name || 'Site Logo'} 
                        className="h-12 md:h-14 lg:h-16 w-40 object-contain"
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
                        className="h-12 md:h-14 lg:h-16 w-auto"
                      />
                    )}
                  </div>
                </Link>
              </div>

              {/* Center - Navigation Links (immediately after logo) */}
              <div className="hidden lg:flex items-center space-x-1 ml-4 md:ml-6 flex-1">
                <Link
                  href="/"
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive('/')
                      ? 'bg-au-corporate-green text-white'
                      : 'text-au-grey-text hover:text-au-gold hover:bg-au-gold/10'
                  )}
                >
                  HOME
                </Link>

                {loading ? (
                  <div className="px-3 py-2 text-sm text-au-grey-text/70">Loading...</div>
                ) : (
                  categories.map((category) => {
                    const hasSubcategories = category.subcategories.length > 0;
                    const isOpen = openMegaMenu === category.id;

                    if (!hasSubcategories && category.publications.length === 0) {
                      // Simple link if no subcategories or publications
                      return (
                        <Link
                          key={category.id}
                          href={`/category/${category.slug}`}
                          className={cn(
                            'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                            isActive(`/category/${category.slug}`)
                              ? 'bg-au-corporate-green text-white'
                              : 'text-au-grey-text hover:text-au-gold hover:bg-au-gold/10'
                          )}
                        >
                          {category.name.toUpperCase()}
                        </Link>
                      );
                    }

                    return (
                      <div
                        key={category.id}
                        className="relative group"
                        onMouseEnter={() => handleMegaMenuEnter(category.id)}
                        onMouseLeave={handleMegaMenuLeave}
                        ref={(el) => setMegaMenuRef(category.id, el)}
                      >
                        <Link
                          href={`/category/${category.slug}`}
                          className={cn(
                            'inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors relative',
                            isActive(`/category/${category.slug}`)
                              ? 'bg-au-corporate-green text-white'
                              : 'text-au-grey-text hover:text-au-gold hover:bg-au-gold/10'
                          )}
                          ref={(el) => {
                            if (el) {
                              navLinkRefs.current.set(category.id, el);
                            }
                          }}
                        >
                          {category.name.toUpperCase()}
                          <ChevronDown className={cn('h-4 w-4 ml-1', isOpen && 'rotate-180', isActive(`/category/${category.slug}`) ? 'text-white' : 'text-au-grey-text')} />
                        </Link>

                        {/* Mega Menu */}
                        {isOpen && (
                          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 mt-2 w-[600px] lg:w-[700px] xl:w-[800px] bg-white rounded-lg shadow-2xl border border-gray-200 py-4 z-50" style={{ maxWidth: 'calc(100vw - 4rem)' }}>
                            {/* Upward Tooltip Point */}
                            <div className="absolute -top-2 w-4 h-4 bg-white border-l border-t border-gray-200 transition-all duration-300" style={{ left: `${tooltipPosition * 100}%`, transform: 'translateX(-50%) rotate(45deg)' }}></div>
                            <div className={cn(
                              "grid gap-6 px-6",
                              hasSubcategories ? "grid-cols-3" : "grid-cols-1"
                            )}>
                              {/* Subcategories Section - Only show if there are subcategories */}
                              {hasSubcategories && (
                                <div className="col-span-1 border-r border-gray-200 pr-4">
                                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    Subcategories
                                  </h3>
                                  <ul className="space-y-1">
                                    {category.subcategories.map((subcategory) => {
                                      const isHovered = hoveredSubcategory?.subcategoryId === subcategory.id;
                                      return (
                                        <li 
                                          key={subcategory.id}
                                          onMouseEnter={() => handleSubcategoryHover(category.id, subcategory.id)}
                                          onMouseLeave={handleSubcategoryLeave}
                                          className="group"
                                        >
                                          <Link
                                            href={`/category/${category.slug}/${subcategory.slug}`}
                                            onClick={() => setOpenMegaMenu(null)}
                                            className={cn(
                                              "block px-3 py-2 text-sm rounded-lg transition-colors",
                                              isHovered
                                                ? "bg-au-corporate-green text-white"
                                                : "text-au-grey-text hover:bg-au-gold/10 hover:text-au-gold"
                                            )}
                                          >
                                            {subcategory.name}
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}

                              {/* Publications Section */}
                              <div 
                                className={hasSubcategories ? "col-span-2" : "col-span-1"}
                                onMouseLeave={() => {
                                  // Clear hovered subcategory when leaving the publications area
                                  setTimeout(() => {
                                    setHoveredSubcategory(null);
                                  }, 100);
                                }}
                              >
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                  Latest Publications
                                </h3>
                                {(() => {
                                  // Determine which publications to show
                                  let publicationsToShow: Publication[] = [];
                                  let isLoading = false;
                                  
                                  if (hoveredSubcategory && hoveredSubcategory.categoryId === category.id) {
                                    const cacheKey = `${category.id}-${hoveredSubcategory.subcategoryId}`;
                                    if (filteredPublications.has(cacheKey)) {
                                      publicationsToShow = filteredPublications.get(cacheKey) || [];
                                    } else {
                                      isLoading = true;
                                      publicationsToShow = [];
                                    }
                                  } else {
                                    publicationsToShow = category.publications;
                                  }

                                  console.log('Rendering publications:', {
                                    hoveredSubcategory,
                                    categoryId: category.id,
                                    publicationsToShow: publicationsToShow.length,
                                    isLoading
                                  });

                                  if (isLoading) {
                                    return <p className="text-xs text-gray-400 px-2">Loading...</p>;
                                  }

                                  return publicationsToShow.length > 0 ? (
                                    <div className={cn(
                                      "grid gap-2",
                                      hasSubcategories ? "grid-cols-2" : "grid-cols-3"
                                    )}>
                                      {publicationsToShow.map((publication) => (
                                      <Link
                                        key={publication.id}
                                        href={`/publication/${publication.slug}`}
                                        onClick={() => setOpenMegaMenu(null)}
                                        className="group relative overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300 hover:shadow-md"
                                      >
                                        {/* Cover Image */}
                                        <div className="relative aspect-[2/1] w-full overflow-hidden">
                                          <img
                                            src={getImageUrl(publication.coverImage) || getImageUrl(PLACEHOLDER_IMAGE_PATH)}
                                            alt={publication.title}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement;
                                              target.src = getImageUrl(PLACEHOLDER_IMAGE_PATH);
                                            }}
                                          />
                                          
                                          {/* Dark Overlay */}
                                          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />

                                          {/* Content Overlay - Bottom */}
                                          <div className="absolute bottom-0 left-0 right-0 z-10 p-2">
                                            {/* Title */}
                                            <h4 className="mb-1 line-clamp-2 text-xs font-bold text-white">
                                              {truncateText(publication.title, 32) || 'Untitled Publication'}
                                            </h4>
                                          </div>
                                        </div>
                                      </Link>
                                    ))}
                                  </div>
                                  ) : (
                                    <p className="text-xs text-gray-400 px-2">
                                      {hoveredSubcategory && hoveredSubcategory.categoryId === category.id
                                        ? "No publications in this subcategory"
                                        : "No publications yet"}
                                    </p>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                
                <Link
                  href="/live-events"
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive('/live-events')
                      ? 'bg-au-corporate-green text-white'
                      : 'text-au-grey-text hover:text-au-gold hover:bg-au-gold/10'
                  )}
                >
                  LIVE EVENTS
                </Link>

              </div>

              {/* Right - Account/Login */}
              <div className="flex items-center space-x-2 md:space-x-3 ml-auto lg:hidden">
                {/* Language Selector */}
                <LanguageSelector />

                {/* User Account or Login */}
                {user ? (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center"
                    >
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-au-gold flex items-center justify-center text-au-white font-medium text-xs md:text-sm border-2 border-au-white shadow-sm">
                        {user?.firstName?.[0] || user?.username?.[0] || 'U'}
                      </div>
                    </button>
                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <div className="px-4 py-2 border-b border-gray-200">
                          <p className="text-sm font-medium text-au-grey-text">{user?.firstName || user?.username}</p>
                          <p className="text-xs text-au-grey-text/70">{user?.email}</p>
                        </div>
                        <Link
                          href="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-au-grey-text hover:bg-au-gold/10 transition-colors"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Profile
                        </Link>
                        {user?.isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center w-full text-left px-4 py-2 text-sm text-au-grey-text hover:bg-au-gold/10 transition-colors"
                          >
                            <LayoutDashboard className="h-4 w-4 mr-2" />
                            Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-au-red hover:bg-au-red/10 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-2 inline" />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Link
                      href="/register"
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-au-gold border border-au-gold rounded-lg hover:bg-au-gold/10 transition-colors"
                    >
                      Register
                    </Link>
                    <Link
                      href="/login"
                      className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-au-gold hover:bg-au-gold/90 rounded-lg transition-colors"
                    >
                      Login
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile Menu Button */}
              <div className="lg:hidden flex items-center ml-2">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 text-au-grey-text hover:text-au-gold hover:bg-au-gold/10 rounded-lg"
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Mobile Menu */}
          <div className={cn(
            "fixed top-[6.5rem] left-0 right-0 bg-white z-40 lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto max-h-[calc(100vh-6.5rem)]",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="p-4">
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-2 transition-colors',
                  isActive('/')
                    ? 'bg-au-corporate-green text-white'
                    : 'text-au-grey-text hover:bg-au-gold/10 hover:text-au-gold'
                )}
              >
                HOME
              </Link>

              <Link
                href="/live-events"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  'flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-2 transition-colors',
                  isActive('/live-events')
                    ? 'bg-au-corporate-green text-white'
                    : 'text-au-grey-text hover:bg-au-gold/10 hover:text-au-gold'
                )}
              >
                LIVE EVENTS
              </Link>

              {loading ? (
                <div className="px-4 py-3 text-sm text-au-grey-text">Loading categories...</div>
              ) : categories.length === 0 ? (
                <div className="px-4 py-3 text-sm text-au-grey-text/70">No categories available</div>
              ) : (
                categories.map((category) => {
                  const isCategoryOpen = openMegaMenu === category.id;
                  const hasSubcategories = category.subcategories.length > 0;

                  return (
                    <div key={category.id} className="mb-2">
                      <div className="flex items-center">
                        <Link
                          href={`/category/${category.slug}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            'flex-1 flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                            isActive(`/category/${category.slug}`)
                              ? 'bg-au-corporate-green text-white'
                              : 'text-au-grey-text hover:bg-au-gold/10 hover:text-au-gold'
                          )}
                        >
                          {category.name.toUpperCase()}
                        </Link>
                        {hasSubcategories && (
                          <button
                            onClick={() => setOpenMegaMenu(isCategoryOpen ? null : category.id)}
                            className="p-2 text-au-grey-text hover:bg-au-gold/10 hover:text-au-gold rounded"
                          >
                            <ChevronDown className={cn('h-4 w-4 transition-transform', isCategoryOpen && 'rotate-180')} />
                          </button>
                        )}
                      </div>

                      {/* Mobile Mega Menu Content - Only show subcategories on mobile */}
                      {isCategoryOpen && hasSubcategories && (
                        <div className="ml-4 mt-2 space-y-4 pb-2 border-l-2 border-gray-200 pl-4">
                          {/* Subcategories - Only show if there are subcategories */}
                          {hasSubcategories && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Subcategories</h4>
                              <ul className="space-y-1">
                                {category.subcategories.map((subcategory) => (
                                  <li key={subcategory.id}>
                                    <Link
                                      href={`/category/${category.slug}/${subcategory.slug}`}
                                      onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        setOpenMegaMenu(null);
                                      }}
                                      className="block px-3 py-2 text-sm text-au-grey-text hover:bg-au-gold/5 rounded-lg"
                                    >
                                      {subcategory.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}


                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Mobile User Section */}
              {user && (
                <div className="border-t border-gray-200 mt-4 pt-4">
                  <div className="px-4 py-3 mb-2">
                    <p className="text-sm font-medium text-au-grey-text">{user.firstName || user.username}</p>
                    <p className="text-xs text-au-grey-text/70">{user.email}</p>
                  </div>
                  <Link
                    href="/my/publications"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-au-grey-text hover:bg-au-gold/10 hover:text-au-gold rounded-lg mb-2"
                  >
                    <FileText className="h-4 w-4 mr-3" />
                    My Publications
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-au-grey-text hover:bg-au-gold/10 hover:text-au-gold rounded-lg mb-2"
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </Link>
                  <Link
                    href="/my/files"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-au-grey-text hover:bg-au-gold/10 hover:text-au-gold rounded-lg mb-2"
                  >
                    <Folder className="h-4 w-4 mr-3" />
                    My Files
                  </Link>
                  {user.isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center w-full px-4 py-3 text-sm font-medium text-au-grey-text hover:bg-au-gold/10 hover:text-au-gold rounded-lg mb-2"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-3" />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-au-red hover:bg-au-red/10 rounded-lg"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Logout
                  </button>
                </div>
              )}
              {!user && (
                <div className="border-t border-gray-200 mt-4 pt-4 space-y-3">
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-au-gold border border-au-gold rounded-lg hover:bg-au-gold/10"
                  >
                    Register
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white bg-au-gold hover:bg-au-gold/90 rounded-lg"
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

