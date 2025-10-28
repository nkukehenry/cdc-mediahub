'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File } from 'lucide-react';
import { UploadZoneProps } from '@/types/fileManager';
import { cn, validateFileType, validateFileSize } from '@/utils/fileUtils';

export default function UploadZone({ onUpload, folderId, disabled = false, className }: UploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md', '.json'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors cursor-pointer',
        isDragActive && 'border-blue-500 bg-blue-50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center space-y-2">
        {isDragActive ? (
          <>
            <File size={32} className="text-blue-500" />
            <p className="text-blue-600 font-medium">Drop files here</p>
          </>
        ) : (
          <>
            <Upload size={32} className="text-gray-400" />
            <div>
              <p className="text-gray-600 font-medium">Drop files here or click to upload</p>
              <p className="text-gray-500 text-sm">Supports images, PDFs, and text files</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
