import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('text/')) return '📝';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📄';
  return '📁';
};

export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

export const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

export const isAudioFile = (mimeType: string): boolean => {
  return mimeType.startsWith('audio/');
};

export const isPdfFile = (mimeType: string): boolean => {
  return mimeType === 'application/pdf';
};

export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  if (allowedTypes.includes('*')) return true;
  return allowedTypes.some(type => {
    if (type.includes('/')) {
      return file.type === type;
    }
    return getFileExtension(file.name) === type;
  });
};

export const validateFileSize = (file: File, maxSize: number): boolean => {
  return file.size <= maxSize;
};
