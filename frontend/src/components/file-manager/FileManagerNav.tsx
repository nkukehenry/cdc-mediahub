'use client';

import { useState } from 'react';
import { Home, Share2, ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import { cn } from '@/utils/fileUtils';

interface FileManagerNavProps {
  currentFolder: string | null;
  activeView: string;
  onHomeClick: () => void;
  onSharedClick: () => void;
  title: string;
  myFilesLabel: string;
  homeLabel: string;
  sharedLabel: string;
  sidebarTree: React.ReactNode;
  sharedTree?: React.ReactNode;
  sharedExpanded?: boolean;
  onToggleShared?: () => void;
}

export default function FileManagerNav({
  currentFolder,
  activeView,
  onHomeClick,
  onSharedClick,
  title,
  myFilesLabel,
  homeLabel,
  sharedLabel,
  sidebarTree,
  sharedTree,
  sharedExpanded = false,
  onToggleShared,
}: FileManagerNavProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-20 left-4 z-30 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        aria-label="Toggle sidebar"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 lg:z-auto bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out overflow-y-auto",
        "w-80",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Title */}
        <div className="px-4 md:px-6  border-gray-200 flex items-center justify-between">
          {/* <h2 className="text-base font-semibold text-au-grey-text">{title}</h2> */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1 hover:bg-gray-100 rounded"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Folders Section */}
        <div className="flex-1 px-4 md:px-6 pb-6 overflow-y-auto">
          <h3 className="text-sm font-bold text-au-grey-text mb-4 mt-4">{myFilesLabel}</h3>
          <div className="space-y-0.5">
            {/* Home */}
            <div
              onClick={() => {
                onHomeClick();
                setIsMobileOpen(false);
              }}
              className={cn(
                'flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors mb-1',
                currentFolder === null && activeView === 'all-files'
                  ? 'bg-au-gold/20 text-au-green'
                  : 'text-au-grey-text hover:text-au-green hover:bg-au-gold/5'
              )}
            >
              <Home size={16} className="mr-3 flex-shrink-0" />
              <span className="text-sm font-medium">{homeLabel}</span>
            </div>

            {/* Shared */}
            <div className="mb-1">
              <div
                onClick={() => {
                  onSharedClick();
                  setIsMobileOpen(false);
                }}
                className={cn(
                  'flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors',
                  activeView === 'shared'
                    ? 'bg-au-gold/20 text-au-green'
                    : 'text-au-grey-text hover:text-au-green hover:bg-au-gold/5'
                )}
              >
                {sharedTree ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleShared && onToggleShared(); }}
                    className="mr-2 p-0.5 hover:bg-gray-200 rounded"
                    aria-label={sharedExpanded ? 'Collapse shared' : 'Expand shared'}
                  >
                    {sharedExpanded ? (
                      <ChevronDown size={14} className="text-au-green" />
                    ) : (
                      <ChevronRight size={14} className="text-au-green" />
                    )}
                  </button>
                ) : (
                  <div className="w-5 mr-2" />
                )}
                <Share2 size={16} className="mr-3 flex-shrink-0" />
                <span className="text-sm font-medium">{sharedLabel}</span>
              </div>
              {sharedExpanded && sharedTree && (
                <div className="ml-6 mt-1">
                  {sharedTree}
                </div>
              )}
            </div>

            {/* Folder tree injected */}
            <div className="mt-2">
              {sidebarTree}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  );
}


