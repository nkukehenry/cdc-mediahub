'use client';

import { FileWithUrls } from '@/types/fileManager';
import { cn, getFileIcon, formatFileSize, isImageFile } from '@/utils/fileUtils';

interface FileListProps {
  folders: Array<{ files: FileWithUrls[] }>;
  onDoubleClick: (file: FileWithUrls) => void;
  className?: string;
}

export default function FileList({ folders, onDoubleClick, className }: FileListProps) {
  const allFiles = folders.flatMap(folder => folder.files);

  return (
    <div className={cn('space-y-1', className)}>
      {allFiles.map((file) => (
        <div
          key={file.id}
          onDoubleClick={() => onDoubleClick(file)}
          className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
        >
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-gray-200 transition-colors overflow-hidden">
            {isImageFile(file.mimeType) && file.thumbnailUrl ? (
              <img 
                src={file.thumbnailUrl} 
                alt={file.originalName}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <span className="text-lg">{getFileIcon(file.mimeType)}</span>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-900 truncate" title={file.originalName}>
                {file.originalName}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {formatFileSize(file.fileSize)} • {file.mimeType}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
