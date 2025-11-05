'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, TrendingUp, Layers, Settings, ChevronDown, Folder, Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/fileUtils';
import { apiClient } from '@/utils/apiClient';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/utils/cacheUtils';

interface Category {
  id: string;
  name: string;
  slug: string;
  showOnMenu?: boolean;
  menuOrder?: number;
}

export default function PublicSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

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
        // Filter categories that should show on menu and sort by menuOrder
        const menuCategories = response.data.categories
          .filter(cat => cat.showOnMenu !== false)
          .sort((a, b) => (a.menuOrder || 0) - (b.menuOrder || 0));
        
        setCategories(menuCategories);
        setCachedData(CACHE_KEYS.CATEGORIES, menuCategories);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Main navigation items
  const mainNav = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/publications?featured=true', label: 'Trending', icon: TrendingUp },
    { href: '/publications', label: 'Publications', icon: Layers },
  ];

  // Determine visible categories based on expand/collapse state
  const visibleCategories = expandedSection === 'categories' 
    ? categories 
    : categories.slice(0, 5);

  // Close drawer when route changes on mobile
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileDrawerOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Mobile Overlay */}
      {isMobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* Sidebar/Drawer */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 overflow-y-auto z-50",
        "transform transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isMobileDrawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Mobile Header with Close Button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
          <Link href="/" onClick={() => setIsMobileDrawerOpen(false)}>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MDB
            </span>
          </Link>
          <button
            onClick={() => setIsMobileDrawerOpen(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* Logo - Desktop only */}
        <div className="hidden lg:block p-4">
          <Link href="/">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              MDB
            </span>
          </Link>
        </div>

      {/* Main Navigation */}
      <nav className="px-4 space-y-1 mb-4">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-4 py-3 rounded-lg transition-colors group",
                isActive 
                  ? "bg-gray-100 text-gray-900" 
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 my-2" />

      {/* Categories */}
      {categories.length > 0 && (
        <>
          <div className="px-4 mb-2">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Categories
            </h3>
            <div className="space-y-1">
              {loading ? (
                <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
              ) : (
                <>
                  {visibleCategories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/category/${category.slug}`}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-100",
                        pathname === `/category/${category.slug}` && "bg-gray-100 text-gray-900"
                      )}
                    >
                      <Folder className="w-5 h-5 flex-shrink-0" />
                      <span className="text-sm truncate flex-1">{category.name}</span>
                    </Link>
                  ))}
                  {categories.length > 5 && (
                    <button
                      onClick={() => setExpandedSection(expandedSection === 'categories' ? null : 'categories')}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors w-full"
                    >
                      <ChevronDown className={cn("w-4 h-4 transition-transform", expandedSection === 'categories' && 'rotate-180')} />
                      <span>{expandedSection === 'categories' ? 'Show less' : `Show ${categories.length - 5} more`}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 my-2" />
        </>
      )}

      {/* Account Management */}
      {user && (
        <>
          <div className="px-4 mb-2">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Account
            </h3>
            <nav className="space-y-1">
              <Link
                href="/admin"
                className="flex items-center gap-4 px-4 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
              >
                <Folder className="w-5 h-5" />
                <span className="text-sm">Admin Dashboard</span>
              </Link>
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-4 px-4 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
              >
                <span className="text-sm">Sign out</span>
              </button>
            </nav>
          </div>

          <div className="border-t border-gray-200 my-2" />
        </>
      )}

      {/* Settings */}
      <div className="px-4 pb-4">
        <Link
          href="/settings"
          className="flex items-center gap-4 px-4 py-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm">Settings</span>
        </Link>
      </div>
    </aside>
  );
}
