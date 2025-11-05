'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Download, Eye, FileIcon, Image, FileText, Video, Music, Archive, File, FileSpreadsheet, FileCode } from 'lucide-react';
import { FileWithUrls } from '@/types/fileManager';
import { cn, formatFileSize, isImageFile, isVideoFile, isAudioFile, isPdfFile } from '@/utils/fileUtils';
import { useTranslation } from '@/hooks/useTranslation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileWithUrls | null;
  className?: string;
}

export default function FilePreviewModal({ isOpen, onClose, file, className }: FilePreviewModalProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch file with auth headers and create blob URL
  useEffect(() => {
    if (isOpen && file) {
      setError(null);
      setIsLoading(true);

      const fetchFile = async () => {
        try {
          const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
          if (!token) {
            setError(t('errors.authenticationRequired'));
            setIsLoading(false);
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/files/${file.id}/download`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!response.ok) {
            throw new Error(`${t('errors.failedToLoadFile')}: ${response.statusText}`);
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          
          // Clean up previous blob URL
          if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
          }
          
          blobUrlRef.current = url;
          setBlobUrl(url);
          setIsLoading(false);
        } catch (err) {
          console.error('Failed to fetch file for preview:', err);
          setError(err instanceof Error ? err.message : t('errors.failedToLoadFile'));
          setIsLoading(false);
        }
      };

      fetchFile();

      // Cleanup blob URL on unmount or file change
      return () => {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        setBlobUrl(null);
      };
    }
  }, [isOpen, file?.id]);

  const handleDownload = async () => {
    if (!file) return;
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        setError(t('errors.authenticationRequired'));
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/files/${file.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(t('errors.downloadFailed'));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      setError(err instanceof Error ? err.message : t('errors.downloadFailed'));
    }
  };

  const getFileIcon = () => {
    if (!file) return <FileIcon size={48} className="text-gray-400" />;
    
    if (isImageFile(file.mimeType)) return <Image size={48} className="text-au-green" />;
    if (isVideoFile(file.mimeType)) return <Video size={48} className="text-au-green" />;
    if (isAudioFile(file.mimeType)) return <Music size={48} className="text-au-green" />;
    if (isPdfFile(file.mimeType)) return <FileText size={48} className="text-au-red" />;
    if (isWordDocument(file.mimeType)) return <FileText size={48} className="text-au-green" />;
    if (isExcelDocument(file.mimeType)) return <FileSpreadsheet size={48} className="text-au-green" />;
    if (isTextFile(file.mimeType)) return <FileCode size={48} className="text-au-grey-text" />;
    if (isArchiveFile(file.mimeType)) return <Archive size={48} className="text-au-gold" />;
    
    return <FileIcon size={48} className="text-au-grey-text/50" />;
  };

  // File type detection functions
  const isWordDocument = (mimeType: string) => {
    return mimeType.includes('word') || 
           mimeType.includes('document') || 
           mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
           mimeType === 'application/msword';
  };

  const isExcelDocument = (mimeType: string) => {
    return mimeType.includes('excel') || 
           mimeType.includes('spreadsheet') ||
           mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
           mimeType === 'application/vnd.ms-excel' ||
           mimeType === 'application/vnd.oasis.opendocument.spreadsheet';
  };

  const isPowerPointDocument = (mimeType: string) => {
    return mimeType.includes('powerpoint') ||
           mimeType.includes('presentation') ||
           mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
           mimeType === 'application/vnd.ms-powerpoint' ||
           mimeType === 'application/vnd.oasis.opendocument.presentation';
  };

  const isOfficeDocument = (mimeType: string) => {
    return isWordDocument(mimeType) || 
           isExcelDocument(mimeType) || 
           isPowerPointDocument(mimeType) ||
           mimeType === 'application/vnd.oasis.opendocument.text' ||
           mimeType === 'application/rtf' ||
           mimeType === 'application/msword' ||
           mimeType === 'application/vnd.ms-office';
  };

  const isTextFile = (mimeType: string) => {
    return mimeType.startsWith('text/') || 
           mimeType === 'application/json' ||
           mimeType === 'application/xml' ||
           mimeType === 'text/plain' ||
           mimeType === 'text/html' ||
           mimeType === 'text/css' ||
           mimeType === 'text/javascript';
  };

  const isArchiveFile = (mimeType: string) => {
    return mimeType.includes('zip') || 
           mimeType.includes('rar') ||
           mimeType.includes('7z') ||
           mimeType.includes('tar') ||
           mimeType.includes('gz');
  };

  const renderPreview = () => {
    if (!file) return null;

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-au-green"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-au-grey-text">
          {getFileIcon()}
          <p className="text-sm mt-4">Preview not available</p>
          <p className="text-xs text-au-grey-text/50 mt-1">{error}</p>
        </div>
      );
    }

    // Wait for blob URL to be ready
    if (!blobUrl) {
      return null;
    }

    // Image preview
    if (isImageFile(file.mimeType)) {
      return (
        <div className={cn("flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden", isFullscreen ? "w-full h-full" : "h-64") }>
          <img
            src={blobUrl}
            alt={file.originalName}
            className={cn(isFullscreen ? "w-full h-full object-contain" : "max-w-full max-h-full object-contain")}
            onError={(e) => {
              console.error('Image load error:', e);
              setError(t('errors.failedToLoadImage'));
            }}
          />
        </div>
      );
    }

    // Video preview
    if (isVideoFile(file.mimeType)) {
      return (
        <div className={cn("flex items-center justify-center bg-gray-50 rounded-lg", isFullscreen ? "w-full h-full" : "h-96") }>
          <video
            controls
            className={cn(isFullscreen ? "w-full h-full" : "max-w-full max-h-full")}
            onError={() => setError(t('errors.failedToLoadVideo'))}
          >
            <source src={blobUrl} type={file.mimeType} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Audio preview
    if (isAudioFile(file.mimeType)) {
      return (
        <div className={cn("flex items-center justify-center bg-gray-50 rounded-lg", isFullscreen ? "h-full" : "h-32 py-8") }>
          <audio
            controls
            className={cn(isFullscreen ? "w-full" : "w-full max-w-md")}
            onError={() => setError(t('errors.failedToLoadAudio'))}
          >
            <source src={blobUrl} type={file.mimeType} />
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    // PDF preview (using iframe with blob URL) - larger for documents
    if (isPdfFile(file.mimeType)) {
      return (
        <div className={cn(isFullscreen ? "w-full h-full" : "h-[calc(95vh-300px)] min-h-[600px]", "bg-gray-50 rounded-lg overflow-hidden") }>
          <iframe
            src={`${blobUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            className={cn("w-full h-full")}
            onError={() => setError(t('errors.failedToLoadPdf'))}
            title="PDF Preview"
          />
        </div>
      );
    }

    // Text file preview - larger for documents
    if (isTextFile(file.mimeType)) {
      return (
        <div className={cn(isFullscreen ? "w-full h-full" : "h-[calc(95vh-300px)] min-h-[600px]", "bg-gray-50 rounded-lg overflow-hidden") }>
          <iframe
            src={blobUrl}
            className={cn("w-full h-full")}
            onError={() => setError(t('errors.failedToLoadTextFile'))}
            title="Text File Preview"
          />
        </div>
      );
    }

    // Office documents (Word, Excel, PowerPoint) - use Google Docs viewer with preview URL
    if (isOfficeDocument(file.mimeType)) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        setError(t('errors.authenticationRequired'));
        return null;
      }

      // Use preview endpoint with token for Google Docs viewer
      const previewUrl = `${API_BASE_URL}/api/files/${file.id}/preview?token=${encodeURIComponent(token)}`;
      const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`;
      
      return (
        <div className={cn(isFullscreen ? "w-full h-full" : "h-[calc(95vh-300px)] min-h-[600px]", "bg-gray-50 rounded-lg overflow-hidden") }>
          <iframe
            src={googleViewerUrl}
            className={cn("w-full h-full")}
            onError={() => setError(t('errors.documentPreviewNotSupported'))}
            title="Document Preview"
          />
        </div>
      );
    }

    // Archive files - show info
    if (isArchiveFile(file.mimeType)) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Archive size={64} className="text-orange-500 mb-4" />
          <p className="text-sm font-medium">Archive File</p>
          <p className="text-xs text-gray-400 mt-1">Download to extract contents</p>
        </div>
      );
    }

    // Default preview for other file types
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        {getFileIcon()}
        <p className="text-sm mt-4">{t('modals.previewNotAvailable')}</p>
        <p className="text-xs text-gray-400 mt-1">{t('modals.downloadToView')}</p>
      </div>
    );
  };

  if (!isOpen || !file) return null;

  // Determine if this is a document type that needs larger modal
  const isDocumentType = isPdfFile(file.mimeType) || 
                         isTextFile(file.mimeType) || 
                         isOfficeDocument(file.mimeType);
  
  const modalSizeClass = isFullscreen
    ? "w-screen h-screen max-w-none max-h-none m-0"
    : (isDocumentType 
      ? "max-w-5xl w-full mx-4 max-h-[100vh]"
      : "max-w-2xl w-full mx-4 max-h-[95vh]");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Translucent backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn("relative bg-white", isFullscreen ? 'rounded-none flex flex-col' : 'rounded-lg', "shadow-xl", modalSizeClass, className, "overflow-hidden")}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Eye size={24} className="text-au-green" />
            <div>
              <h2 className="text-xl font-semibold text-au-grey-text">File Preview</h2>
              <p className="text-sm text-au-grey-text/70">{file.originalName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(prev => !prev)}
              className="px-2 py-1 text-xs rounded border border-gray-300 bg-white text-au-grey-text hover:bg-gray-50"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={cn(isFullscreen ? "h-[calc(100vh-80px)] overflow-auto p-0" : "p-6") }>
          {/* Preview Area */}
          <div className={cn(isFullscreen ? "h-full" : "mb-6") }>
            {renderPreview()}
          </div>

          {/* File Information */}
          {!isFullscreen && (
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1 text-xs">
                <div>
                  <span className="text-au-grey-text/60">Name:</span>
                  <p className="font-medium text-au-grey-text truncate" title={file.originalName}>
                    {file.originalName}
                  </p>
                </div>
                <div>
                  <span className="text-au-grey-text/60">Size:</span>
                  <p className="font-medium text-au-grey-text">{formatFileSize(file.fileSize)}</p>
                </div>
                <div>
                  <span className="text-au-grey-text/60">Type:</span>
                  <p className="font-medium text-au-grey-text truncate" title={file.mimeType}>
                    {file.mimeType}
                  </p>
                </div>
                <div>
                  <span className="text-au-grey-text/60">Created:</span>
                  <p className="font-medium text-au-grey-text">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 text-sm font-medium text-au-white bg-au-green rounded-lg hover:bg-au-corporate-green transition-colors flex items-center"
          >
            <Download size={16} className="mr-2" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
