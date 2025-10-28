'use client';

import { FileWithUrls } from '@/types/fileManager';
import { cn, getFileIcon, formatFileSize, isImageFile } from '@/utils/fileUtils';

interface FileGridProps {
  folders: Array<{ files: FileWithUrls[] }>;
  onDoubleClick: (file: FileWithUrls) => void;
  className?: string;
}

export default function FileGrid({ folders, onDoubleClick, className }: FileGridProps) {
  const allFiles = folders.flatMap(folder => folder.files);

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4', className)}>
      {allFiles.map((file) => (
        <div
          key={file.id}
          onDoubleClick={() => onDoubleClick(file)}
          className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-gray-200 transition-colors overflow-hidden">
            {isImageFile(file.mimeType) && file.thumbnailUrl ? (
              <img 
                src={file.thumbnailUrl} 
                alt={file.originalName}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
            )}
          </div>
          
          <span className="text-sm font-medium text-gray-900 text-center truncate w-full" title={file.originalName}>
            {file.originalName}
          </span>
          <span className="text-xs text-gray-500">
            {formatFileSize(file.fileSize)}
          </span>
        </div>
      ))}
    </div>
  );
}
