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

export const truncateText = (value?: string | null, maxLength = 32): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const sliceEnd = Math.max(0, maxLength - 3);
  return `${trimmed.slice(0, sliceEnd).trimEnd()}...`;
};

/**
 * Default placeholder image path in the uploads folder
 */
export const PLACEHOLDER_IMAGE_PATH = 'uploads/placeholder-image.jpg';

/**
 * Get the full URL for an uploaded file/image
 * Handles absolute URLs, relative paths, and file paths from the uploads directory
 * Also normalizes Windows-style backslashes to forward slashes
 * 
 * @param filePath - The file path (can be absolute URL, relative path, or filename)
 * @returns The full URL to access the file
 * 
 * @example
 * getFileUrl('/uploads/image.jpg') // Returns: http://localhost:3001/uploads/image.jpg
 * getFileUrl('uploads\\image.jpg') // Returns: http://localhost:3001/uploads/image.jpg (normalizes backslashes)
 * getFileUrl('image.jpg') // Returns: http://localhost:3001/uploads/image.jpg
 * getFileUrl('http://example.com/image.jpg') // Returns: http://example.com/image.jpg (unchanged)
 */
export const getFileUrl = (filePath?: string | null): string => {
  if (!filePath) return '';
  
  // If it's already a full URL (http:// or https://), return as-is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  // Normalize path: replace backslashes with forward slashes (Windows paths)
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Remove leading slash if present to avoid double slashes
  const cleanPath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
  
  // If path already includes 'uploads/', use it directly
  if (cleanPath.startsWith('uploads/')) {
    return `${baseUrl}/${cleanPath}`;
  }
  
  // Otherwise, assume it's a file in the uploads directory
  return `${baseUrl}/uploads/${cleanPath}`;
};

/**
 * Get the full URL for an image file (alias for getFileUrl for semantic clarity)
 * 
 * @param imagePath - The image path (can be absolute URL, relative path, or filename)
 * @returns The full URL to access the image
 */
export const getImageUrl = (imagePath?: string | null): string => {
  return getFileUrl(imagePath);
};