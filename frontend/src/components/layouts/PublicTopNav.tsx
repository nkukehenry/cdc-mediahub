'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Video, Grid3X3, Bell, User, Menu } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import LanguageSelector from '@/components/LanguageSelector';

export default function PublicTopNav() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/publications?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleAccountClick = () => {
    if (user) {
      setShowAccountMenu(!showAccountMenu);
    } else {
      router.push('/admin');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-8">
      <div className="flex items-center h-16">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-l-full rounded-r-full focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Right Side Icons */}
        <div className="flex items-center gap-2 ml-6">
          {/* Create Video */}
          <button className="p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <Video className="w-6 h-6" />
          </button>

          {/* App Grid */}
          <button className="p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <Grid3X3 className="w-6 h-6" />
          </button>

          {/* Notifications */}
          <button className="p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <Bell className="w-6 h-6" />
          </button>

          {/* Account */}
          <div className="relative">
            <button
              onClick={handleAccountClick}
              className="p-1 hover:opacity-80 transition-opacity"
            >
              {user ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                  {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </button>

            {/* Account Dropdown */}
            {showAccountMenu && user && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <Link
                  href="/admin"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowAccountMenu(false)}
                >
                  Admin Dashboard
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setShowAccountMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Language Selector */}
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
}

