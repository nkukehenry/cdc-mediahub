'use client';

import { useState, useEffect } from 'react';
import { X, Download, Eye, FileIcon, Image, FileText, Video, Music, Archive, File, FileSpreadsheet, FileCode } from 'lucide-react';
import { FileWithUrls } from '@/types/fileManager';
import { cn, formatFileSize, isImageFile, isVideoFile, isAudioFile, isPdfFile } from '@/utils/fileUtils';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileWithUrls | null;
  className?: string;
}

export default function FilePreviewModal({ isOpen, onClose, file, className }: FilePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && file) {
      setError(null);
      setIsLoading(true);
      
      // Simulate loading for better UX
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, file]);

  const handleDownload = () => {
    if (file?.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
    }
  };

  const getFileIcon = () => {
    if (!file) return <FileIcon size={48} className="text-gray-400" />;
    
    if (isImageFile(file.mimeType)) return <Image size={48} className="text-blue-500" />;
    if (isVideoFile(file.mimeType)) return <Video size={48} className="text-purple-500" />;
    if (isAudioFile(file.mimeType)) return <Music size={48} className="text-green-500" />;
    if (isPdfFile(file.mimeType)) return <FileText size={48} className="text-red-500" />;
    if (isWordDocument(file.mimeType)) return <FileText size={48} className="text-blue-600" />;
    if (isExcelDocument(file.mimeType)) return <FileSpreadsheet size={48} className="text-green-600" />;
    if (isTextFile(file.mimeType)) return <FileCode size={48} className="text-gray-600" />;
    if (isArchiveFile(file.mimeType)) return <Archive size={48} className="text-orange-500" />;
    
    return <FileIcon size={48} className="text-gray-400" />;
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
           mimeType === 'application/vnd.ms-excel';
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          {getFileIcon()}
          <p className="text-sm mt-4">Preview not available</p>
          <p className="text-xs text-gray-400 mt-1">{error}</p>
        </div>
      );
    }

    // Image preview
    if (isImageFile(file.mimeType)) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg overflow-hidden">
          <img
            src={file.downloadUrl}
            alt={file.originalName}
            className="max-w-full max-h-full object-contain"
            onError={() => setError('Failed to load image')}
          />
        </div>
      );
    }

    // Video preview
    if (isVideoFile(file.mimeType)) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <video
            controls
            className="max-w-full max-h-full"
            onError={() => setError('Failed to load video')}
          >
            <source src={file.downloadUrl} type={file.mimeType} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Audio preview
    if (isAudioFile(file.mimeType)) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <audio
            controls
            className="w-full"
            onError={() => setError('Failed to load audio')}
          >
            <source src={file.downloadUrl} type={file.mimeType} />
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    // PDF preview (using iframe)
    if (isPdfFile(file.mimeType)) {
      return (
        <div className="h-64 bg-gray-50 rounded-lg overflow-hidden">
          <iframe
            src={`${file.downloadUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            className="w-full h-full"
            onError={() => setError('Failed to load PDF')}
          />
        </div>
      );
    }

    // Text file preview
    if (isTextFile(file.mimeType)) {
      return (
        <div className="h-64 bg-gray-50 rounded-lg overflow-hidden">
          <iframe
            src={file.downloadUrl}
            className="w-full h-full"
            onError={() => setError('Failed to load text file')}
          />
        </div>
      );
    }

    // Word/Excel documents - use Office Online viewer
    if (isWordDocument(file.mimeType) || isExcelDocument(file.mimeType)) {
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.downloadUrl)}`;
      return (
        <div className="h-64 bg-gray-50 rounded-lg overflow-hidden">
          <iframe
            src={officeViewerUrl}
            className="w-full h-full"
            onError={() => setError('Failed to load document')}
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
        <p className="text-sm mt-4">Preview not available</p>
        <p className="text-xs text-gray-400 mt-1">Click download to view this file</p>
      </div>
    );
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Translucent backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn("relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden", className)}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Eye size={24} className="text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">File Preview</h2>
              <p className="text-sm text-gray-500">{file.originalName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Preview Area */}
          <div className="mb-6">
            {renderPreview()}
          </div>

          {/* File Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">File Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <p className="font-medium text-gray-900 truncate" title={file.originalName}>
                  {file.originalName}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Size:</span>
                <p className="font-medium text-gray-900">{formatFileSize(file.fileSize)}</p>
              </div>
              <div>
                <span className="text-gray-500">Type:</span>
                <p className="font-medium text-gray-900">{file.mimeType}</p>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>
                <p className="font-medium text-gray-900">
                  {new Date(file.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
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
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Download size={16} className="mr-2" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
