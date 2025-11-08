'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckSquare, Square, MoreVertical } from 'lucide-react';
import { FileWithUrls, FolderWithFiles } from '@/types/fileManager';
import { useTranslation } from '@/hooks/useTranslation';

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
      className="group border border-gray-200 rounded-lg p-3 hover:shadow-sm transition cursor-pointer"
      onClick={handleCardClick}
      title={item.name}
    >
      <div className="flex items-center justify-between mb-2 relative">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          {icon}
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id); }}
            className="p-1 hover:bg-gray-200 rounded"
            aria-label={selected ? 'Deselect' : 'Select'}
          >
            {selected ? (
              <CheckSquare size={14} className="text-au-green" />
            ) : (
              <Square size={14} className="text-au-grey-text/40" />
            )}
          </button>
          {mode !== 'picker' && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(prev => !prev);
                }}
                className="p-1 hover:bg-gray-200 rounded"
                aria-label={t('fileManager.manage')}
              >
                <MoreVertical size={14} className="text-gray-400" />
              </button>
              {isMenuOpen && (
                <div
                  className="absolute right-0 top-6 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpen(item);
                    }}
                  >
                    {t('fileManager.open') || t('common.view')}
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-xs hover/bg-gray-50"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onShare(item);
                    }}
                  >
                    {t('fileManager.share')}
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onMove(item);
                    }}
                  >
                    {t('fileManager.move')}
                  </button>
                  {!item.isFolder && onRename && (
                    <button
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onRename(item);
                      }}
                    >
                      {t('common.rename')}
                    </button>
                  )}
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDelete(item);
                    }}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="text-xs font-medium text-au-grey-text truncate">{item.name}</div>
      <div className="text-[10px] text-au-grey-text/70 mt-1 flex items-center justify-between">
        <span>{item.lastModified}</span>
      </div>
    </div>
  );
}


