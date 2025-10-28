'use client';

import { Folder, ChevronRight } from 'lucide-react';
import { FolderWithFiles } from '@/types/fileManager';
import { cn, formatFileSize } from '@/utils/fileUtils';

interface FolderListProps {
  folders: FolderWithFiles[];
  onDoubleClick: (folder: FolderWithFiles) => void;
  className?: string;
}

export default function FolderList({ folders, onDoubleClick, className }: FolderListProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {folders.map((folder) => {
        const totalSize = folder.files.reduce((sum, file) => sum + file.fileSize, 0);
        
        return (
          <div
            key={folder.id}
            onDoubleClick={() => onDoubleClick(folder)}
            className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
          >
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
              <Folder size={16} className="text-blue-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 truncate" title={folder.name}>
                  {folder.name}
                </span>
                <ChevronRight size={14} className="text-gray-400 ml-2" />
              </div>
              <div className="text-xs text-gray-500">
                {folder.files.length} file{folder.files.length !== 1 ? 's' : ''}
                {totalSize > 0 && ` • ${formatFileSize(totalSize)}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
