'use client';

import { CheckSquare, Square, Share2 } from 'lucide-react';
import { FileWithUrls, FolderWithFiles } from '@/types/fileManager';

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
  icon: React.ReactNode;
  mode?: 'manager' | 'picker';
}

export default function FileGridCard({ item, selected, onToggleSelect, onOpen, onShare, onMove, icon, mode = 'manager' }: FileGridCardProps) {
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
      <div className="flex items-center justify-between mb-2">
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
          <button
            onClick={(e) => { e.stopPropagation(); onShare(item); }}
            className="p-1 hover:bg-gray-200 rounded"
            aria-label="Share"
          >
            <Share2 size={12} className="text-gray-400" />
          </button>
        </div>
      </div>
      <div className="text-xs font-medium text-au-grey-text truncate">{item.name}</div>
      <div className="text-[10px] text-au-grey-text/70 mt-1 flex items-center justify-between">
        <span>{item.lastModified}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onMove(item); }}
          className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Move
        </button>
      </div>
    </div>
  );
}


