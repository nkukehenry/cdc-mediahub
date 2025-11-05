'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  Home as HomeIcon,
  FolderTree, 
  FileText, 
  FolderOpen, 
  Settings, 
  User,
  LogOut,
  Menu,
  X,
  Image as ImageIcon,
  ChevronDown,
  Search,
  Bell,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/utils/fileUtils';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSelector from './LanguageSelector';


interface NavSubItem {
  label: string;
  path: string;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: any;
  subItems?: NavSubItem[];
}

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const dropdownRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  const navItems: NavItem[] = [
    { id: 'home', label: t('nav.home'), path: '/admin', icon: HomeIcon },
    { 
      id: 'categories', 
      label: t('nav.categories'), 
      path: '/admin/categories', 
      icon: FolderOpen,
      subItems: [
        { label: t('nav.mainCategories'), path: '/admin/categories' },
        { label: t('nav.subcategories'), path: '/admin/subcategories' },
      ]
    },
    { id: 'files', label: t('nav.fileManager'), path: '/admin/files', icon: FolderTree },
    { 
      id: 'publications', 
      label: t('nav.publications'), 
      path: '/admin/publications', 
      icon: FileText,
      subItems: [
        { label: t('nav.createPublication'), path: '/admin/publications/new' },
        { label: t('nav.allPublications'), path: '/admin/publications' },
        { label: t('nav.pendingPublications'), path: '/admin/publications?status=pending' },
        { label: t('nav.draftPublications'), path: '/admin/publications?status=draft' },
        { label: t('nav.rejectedPublications'), path: '/admin/publications?status=rejected' },
        { label: t('nav.comments'), path: '/admin/publications/comments' },
      ]
    },
    { 
      id: 'configurations', 
      label: t('nav.configurations'), 
      path: '/admin/settings', 
      icon: Settings,
      subItems: [
        { label: t('nav.navLinks'), path: '/admin/nav-links' },
        { label: t('nav.cache'), path: '/admin/cache' },
        { label: t('nav.settings'), path: '/admin/settings' },
      ]
    },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    // For categories dropdown, check if we're on categories or subcategories page
    if (path === '/admin/categories') {
      return pathname === '/admin/categories' || pathname === '/admin/subcategories';
    }
    // For configurations dropdown, check if we're on nav-links, cache or settings page
    if (path === '/admin/settings') {
      return pathname === '/admin/nav-links' || pathname === '/admin/cache' || pathname === '/admin/settings';
    }
    return pathname?.startsWith(path);
  };

  const handleLogout = async () => {
    logout();
    // Navigate to login page immediately after logout
    // Use replace to prevent back button navigation
    router.replace('/admin');
  };

  const toggleDropdown = (itemId: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const setDropdownRef = (itemId: string, element: HTMLDivElement | null) => {
    if (element) {
      dropdownRefs.current.set(itemId, element);
    } else {
      dropdownRefs.current.delete(itemId);
    }
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserMenu]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      for (const [itemId, ref] of dropdownRefs.current.entries()) {
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdowns(prev => {
            const newSet = new Set(prev);
            newSet.delete(itemId);
            return newSet;
          });
        }
      }
    };

    if (openDropdowns.size > 0) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openDropdowns]);

  return (
    <>
      <nav className="bg-au-corporate-green sticky top-0 z-50">
        <div className="w-full px-4 md:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left - Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/admin/files" className="flex items-center space-x-2">
                <div className="flex items-center justify-center">
                  <img 
                    src="/logo.png" 
                    alt="Media Hub Logo" 
                    className="h-8 md:h-10 w-auto"
                  />
                </div>
                <span className="text-sm md:text-base font-semibold text-white hidden sm:inline">{t('brand.name')}</span>
              </Link>
            </div>

            {/* Center - Navigation Links */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isDropdownOpen = openDropdowns.has(item.id);

                if (hasSubItems) {
                  return (
                    <div key={item.id} className="relative" ref={(el) => setDropdownRef(item.id, el)}>
                      <button
                        onClick={() => toggleDropdown(item.id)}
                        className={cn(
                          'inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                          active
                            ? 'bg-white text-au-corporate-green'
                            : 'text-white hover:text-white hover:bg-au-corporate-green/80'
                        )}
                      >
                        <Icon className={cn('h-4 w-4 mr-2', active ? 'text-au-corporate-green' : 'text-white')} />
                        {item.label}
                        <ChevronDown className={cn('h-4 w-4 ml-2', active ? 'text-au-corporate-green' : 'text-white')} />
                      </button>
                      {isDropdownOpen && (
                        <div className="absolute mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-40">
                          {item.subItems!.map((subItem) => (
                            <Link
                              key={subItem.path}
                              href={subItem.path}
                              onClick={() => toggleDropdown(item.id)}
                              className="block px-4 py-2 text-sm text-au-grey-text hover:bg-au-gold/5"
                            >
                              {subItem.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    className={cn(
                      'inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      active
                        ? 'bg-white text-au-corporate-green'
                        : 'text-white hover:text-white hover:bg-au-corporate-green/80'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 mr-2', active ? 'text-au-corporate-green' : 'text-white')} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Right - Icons and User */}
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Language Selector */}
              <LanguageSelector />

              {/* Search Icon - Hidden on mobile */}
              <button className="hidden md:flex p-2 text-white hover:text-white hover:bg-au-corporate-green/80 rounded-lg transition-colors">
                <Search className="h-5 w-5" />
              </button>

              {/* Settings Icon - Hidden on mobile */}
              <button className="hidden md:flex p-2 text-white hover:text-white hover:bg-au-corporate-green/80 rounded-lg transition-colors">
                <Settings className="h-5 w-5" />
              </button>

              {/* Notifications Icon - Hidden on mobile */}
              <button className="hidden md:flex p-2 text-white hover:text-white hover:bg-au-corporate-green/80 rounded-lg transition-colors">
                <Bell className="h-5 w-5" />
              </button>

              {/* User Avatar with Dropdown */}
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
                    <button
                      onClick={() => setShowUserMenu(false)}
                      className="w-full text-left px-4 py-2 text-sm text-au-grey-text hover:bg-au-gold/5 transition-colors"
                    >
                      <Settings className="h-4 w-4 mr-2 inline" />
                      {t('nav.settings')}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-au-red hover:bg-au-red/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-2 inline" />
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center ml-2">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-white hover:text-white hover:bg-au-corporate-green/80 rounded-lg"
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
      </nav>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Slide-in menu */}
          <div className={cn(
            "fixed top-16 left-0 right-0 bottom-0 bg-white z-40 lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            <div className="p-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isDropdownOpen = openDropdowns.has(item.id);

                if (hasSubItems) {
                  return (
                    <div key={item.id} className="mb-2">
                      <button
                        onClick={() => toggleDropdown(item.id)}
                        className={cn(
                          'flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                          active
                            ? 'bg-au-corporate-green text-white'
                            : 'text-au-grey-text hover:bg-gray-100'
                        )}
                      >
                        <div className="flex items-center">
                          <Icon className={cn('h-4 w-4 mr-3', active ? 'text-white' : 'text-au-grey-text')} />
                          {item.label}
                        </div>
                        <ChevronDown className={cn('h-4 w-4 transition-transform', isDropdownOpen && 'rotate-180')} />
                      </button>
                      {isDropdownOpen && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.subItems!.map((subItem) => (
                            <Link
                              key={subItem.path}
                              href={subItem.path}
                              onClick={() => {
                                toggleDropdown(item.id);
                                setIsMobileMenuOpen(false);
                              }}
                              className="block px-4 py-2 text-sm text-au-grey-text hover:bg-au-gold/5 rounded-lg"
                            >
                              {subItem.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center px-4 py-3 text-sm font-medium rounded-lg mb-2 transition-colors',
                      active
                        ? 'bg-au-corporate-green text-white'
                        : 'text-au-grey-text hover:bg-gray-100'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 mr-3', active ? 'text-white' : 'text-au-grey-text')} />
                    {item.label}
                  </Link>
                );
              })}
              
              {/* User section */}
              {user && (
                <div className="border-t border-gray-200 mt-4 pt-4">
                  <div className="px-4 py-3 mb-2">
                    <p className="text-sm font-medium text-au-grey-text">{user.firstName || user.username}</p>
                    <p className="text-xs text-au-grey-text/70">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-au-grey-text hover:bg-gray-100 rounded-lg mb-2"
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    {t('nav.settings')}
                  </button>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm font-medium text-au-red hover:bg-au-red/10 rounded-lg"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

