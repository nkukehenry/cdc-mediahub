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

interface FileListRowProps {
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

export default function FileListRow({
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
}: FileListRowProps) {
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
  const handleToggleSelect = () => {
    onToggleSelect(item.id);
  };

  const handleNameClick = () => {
    if (mode === 'picker' && !item.isFolder) {
      // In picker mode, clicking the name selects the file
      onToggleSelect(item.id);
    } else {
      // In manager mode, open the file/folder
      onOpen(item);
    }
  };

  return (
    <div 
      key={item.id} 
      className="px-6 py-2 hover:bg-gray-50 transition-colors"
    >
      <div className="grid grid-cols-12 gap-4 items-center">
        <div className="col-span-1">
          <button 
            onClick={handleToggleSelect}
            className="p-0.5 hover:bg-au-gold/10 rounded"
            aria-label={selected ? 'Deselect' : 'Select'}
          >
            {selected ? (
              <CheckSquare size={14} className="text-au-green" />
            ) : (
              <Square size={14} className="text-au-grey-text/40" />
            )}
          </button>
        </div>
        <div className="col-span-5 flex items-center space-x-2">
          <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
            {icon}
          </div>
          <button 
            className="text-xs font-medium text-au-grey-text truncate hover:text-au-green text-left"
            onClick={handleNameClick}
            title={item.name}
          >
            {item.name}
          </button>
        </div>
        <div className="col-span-2 text-xs text-au-grey-text">{item.lastModified}</div>
        <div className="col-span-2 text-xs text-au-grey-text">{item.size}</div>
        {mode !== 'picker' && (
          <div className="col-span-2 flex justify-end relative">
            <button
              onClick={() => setIsMenuOpen(prev => !prev)}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors"
              aria-label={t('fileManager.manage')}
            >
              <MoreVertical size={16} className="text-gray-500" />
            </button>
            {isMenuOpen && (
              <div
                ref={menuRef}
                className="absolute right-0 top-6 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
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
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
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
  );
}


