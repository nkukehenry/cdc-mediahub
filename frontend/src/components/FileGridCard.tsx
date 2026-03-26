'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckSquare, Square, MoreVertical, Share2 } from 'lucide-react';
import { FileWithUrls, FolderWithFiles } from '@/types/fileManager';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/utils/fileUtils';

interface ItemData {
  id: string;
  name: string;
  lastModified: string;
  size: string;
  isFolder: boolean;
  data: FileWithUrls | FolderWithFiles;
}

interface FileGridCardProps {
  item: ItemData;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (item: ItemData) => void;
  onShare: (item: ItemData) => void;
  onMove: (item: ItemData) => void;
  onDelete: (item: ItemData) => void;
  onRename?: (item: ItemData) => void;
  icon: React.ReactNode;
  mode?: 'manager' | 'picker';
}

export default function FileGridCard({
  item,
  selected,
  onToggleSelect,
  onOpen,
  onShare,
  onMove,
  onDelete,
  onRename,
  icon,
  mode = 'manager'
}: FileGridCardProps) {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);
  const handleCardClick = () => {
    if (mode === 'picker' && !item.isFolder) {
      // In picker mode, clicking a file selects it (same as clicking the checkbox)
      // Just call onToggleSelect, which will handle the selection
      onToggleSelect(item.id);
    } else {
      // In manager mode, open the file/folder
      onOpen(item);
    }
  };

  return (
    <div
      key={item.id}
      className={cn(
        "group border rounded-xl p-3 transition-all duration-200 cursor-pointer flex flex-col h-full bg-white",
        selected
          ? "border-au-green ring-1 ring-au-green shadow-sm"
          : "border-gray-200 hover:border-au-green/50 hover:shadow-md"
      )}
      onClick={handleCardClick}
      title={item.name}
    >
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 group-hover:bg-white group-hover:border-au-green/20 transition-colors">
          {icon}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id); }}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={selected ? 'Deselect' : 'Select'}
          >
            {selected ? (
              <CheckSquare size={14} className="text-au-green" />
            ) : (
              <Square size={14} className="text-au-grey-text/30 group-hover:text-au-grey-text/50" />
            )}
          </button>
          {mode !== 'picker' && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(prev => !prev);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={t('fileManager.manage')}
              >
                <MoreVertical size={14} className="text-gray-400 group-hover:text-gray-600" />
              </button>
              {isMenuOpen && (
                <div
                  className="absolute right-0 top-8 w-44 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden py-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-au-gold/5 flex items-center space-x-2 transition-colors"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpen(item);
                    }}
                  >
                    <span>{t('fileManager.open') || t('common.view')}</span>
                  </button>
                  <button
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-au-gold/5 flex items-center space-x-2 transition-colors"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onShare(item);
                    }}
                  >
                    <span>{t('fileManager.share')}</span>
                  </button>
                  <button
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-au-gold/5 flex items-center space-x-2 transition-colors"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onMove(item);
                    }}
                  >
                    <span>{t('fileManager.move')}</span>
                  </button>
                  {!item.isFolder && onRename && (
                    <button
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-au-gold/5 flex items-center space-x-2 transition-colors"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onRename(item);
                      }}
                    >
                      <span>{t('common.rename')}</span>
                    </button>
                  )}
                  <div className="h-px bg-gray-100 my-1 mx-2"></div>
                  <button
                    className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDelete(item);
                    }}
                  >
                    <span>{t('common.delete')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Area */}
      <div className="flex-1 min-h-[140px] flex items-center justify-center mb-3 bg-gray-50/50 rounded-lg overflow-hidden border border-gray-100 group-hover:border-au-green/10 transition-colors">
        {!item.isFolder && (item.data as FileWithUrls).thumbnailUrl ? (
          <img
            src={(item.data as FileWithUrls).thumbnailUrl!}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              // Hide image and show fallback icon if loading fails
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.classList.add('p-8');
            }}
          />
        ) : (
          <div className="p-10 opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-auto">
        <div className="flex items-center space-x-1.5 min-w-0">
          <div className="text-xs font-semibold text-au-grey-text truncate group-hover:text-au-green transition-colors">{item.name}</div>
          {((item.data as any).accessType === 'shared' || (item.data as any).accessType === 'public') && (
            <div className="flex items-center space-x-1 text-au-green flex-shrink-0">
              <Share2 size={10} />
              {!(item.data as any).sharedBy && (
                <span className="text-[10px] whitespace-nowrap">{t('fileManager.shared')}</span>
              )}
            </div>
          )}
        </div>
        {(item.data as any).sharedBy && (
          <div className="text-[10px] text-gray-400 mt-1 truncate">
            {t('fileManager.sharedBy') || 'Shared by'}: {(item.data as any).sharedBy.username}
          </div>
        )}
        <div className="text-[10px] text-au-grey-text/50 mt-1.5 flex items-center justify-between">
          <span>{item.lastModified}</span>
          {!item.isFolder && <span>{item.size}</span>}
        </div>
      </div>
    </div>
  );
}


