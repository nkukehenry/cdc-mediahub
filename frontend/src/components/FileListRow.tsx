'use client';

import { CheckSquare, Square, Share2 } from 'lucide-react';
import { cn } from '@/utils/fileUtils';
import { FileWithUrls, FolderWithFiles } from '@/types/fileManager';

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
  icon: React.ReactNode;
}

export default function FileListRow({ item, selected, onToggleSelect, onOpen, onShare, onMove, icon }: FileListRowProps) {
  return (
    <div 
      key={item.id} 
      className="px-6 py-2 hover:bg-gray-50 transition-colors"
    >
      <div className="grid grid-cols-12 gap-4 items-center">
        <div className="col-span-1">
          <button 
            onClick={() => onToggleSelect(item.id)}
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
            onClick={() => onOpen(item)}
            title={item.name}
          >
            {item.name}
          </button>
        </div>
        <div className="col-span-2 text-xs text-au-grey-text">{item.lastModified}</div>
        <div className="col-span-2 text-xs text-au-grey-text">{item.size}</div>
        <div className="col-span-2 flex items-center space-x-2">
          <button
            onClick={() => onMove(item)}
            className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
          >
            Move
          </button>
          <button className="p-0.5 hover:bg-gray-200 rounded" onClick={() => onShare(item)} aria-label="Share">
            <Share2 size={12} className="text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}


