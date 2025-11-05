'use client';

import { Folder } from 'lucide-react';
import { FolderWithFiles } from '@/types/fileManager';
import { cn } from '@/utils/fileUtils';

interface FolderGridProps {
  folders: FolderWithFiles[];
  onDoubleClick: (folder: FolderWithFiles) => void;
  className?: string;
}

export default function FolderGrid({ folders, onDoubleClick, className }: FolderGridProps) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4', className)}>
      {folders.map((folder) => (
        <div
          key={folder.id}
          onDoubleClick={() => onDoubleClick(folder)}
          className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
        >
          <div className="w-12 h-12 bg-au-gold/20 rounded-lg flex items-center justify-center mb-2 group-hover:bg-au-gold/30 transition-colors">
            <Folder size={24} className="text-au-green" />
          </div>
          <span className="text-sm font-medium text-au-grey-text text-center truncate w-full" title={folder.name}>
            {folder.name}
          </span>
          <span className="text-xs text-au-grey-text/70">
            {folder.files.length} file{folder.files.length !== 1 ? 's' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
