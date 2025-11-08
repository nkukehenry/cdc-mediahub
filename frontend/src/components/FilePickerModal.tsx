'use client';

import { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { Provider, useSelector } from 'react-redux';
import { store } from '@/store';
import FileManager from './FileManager';
import UploadModal from './UploadModal';
import { FileWithUrls } from '@/types/fileManager';
import { useTranslation } from '@/hooks/useTranslation';
import { useFileUpload } from '@/hooks/useFileUpload';

interface FilePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFiles: (files: FileWithUrls[]) => void;
  selectedFiles?: FileWithUrls[];
  title?: string;
  description?: string;
  multiple?: boolean;
  filterMimeTypes?: string[]; // e.g., ['image/*'] to only show images
}

function FilePickerModalContent({
  isOpen,
  onClose,
  onSelectFiles,
  selectedFiles = [],
  title,
  description,
  multiple = true,
  filterMimeTypes
}: FilePickerModalProps) {
  const { t } = useTranslation();
  const currentFolder = useSelector((state: any) => state.fileManager.currentFolder);
  const [tempSelectedFiles, setTempSelectedFiles] = useState<FileWithUrls[]>(selectedFiles);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [autoSelectUploaded, setAutoSelectUploaded] = useState(true);
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);

  const { handleUploadComplete: refreshAfterUpload, getUploadedFilesByName } = useFileUpload({
    currentFolder,
    silentRefresh: true,
  });

  // Update temp selected files when modal opens (only on open, not on every selectedFiles change)
  useEffect(() => {
    if (isOpen) {
      console.log('FilePickerModal - Modal opened, setting tempSelectedFiles to:', selectedFiles);
      setTempSelectedFiles(selectedFiles);
      setUploadedFileNames([]);
    }
  }, [isOpen]); // Only depend on isOpen, not selectedFiles to prevent resetting during selection

  // Track changes to tempSelectedFiles
  useEffect(() => {
    console.log('FilePickerModal - tempSelectedFiles changed:', tempSelectedFiles);
    console.log('FilePickerModal - tempSelectedFiles length:', tempSelectedFiles.length);
  }, [tempSelectedFiles]);

  if (!isOpen) return null;

  const handleUploadComplete = async (uploadedFiles: File[]) => {
    // Store uploaded file names for auto-selection
    const fileNames = uploadedFiles.map(f => f.name);
    setUploadedFileNames(fileNames);
    
    // Refresh folder tree and file list using reusable logic
    await refreshAfterUpload(uploadedFiles);
    
    // Optionally auto-select uploaded files if enabled
    if (autoSelectUploaded && fileNames.length > 0) {
      // Wait for files to be available, then find and select them by name
      setTimeout(async () => {
        try {
          const newlyUploadedFiles = await getUploadedFilesByName(fileNames, currentFolder);
          
          if (newlyUploadedFiles.length > 0) {
            if (multiple) {
              // Add to existing selection
              setTempSelectedFiles(prev => {
                const existingIds = new Set(prev.map(f => f.id));
                const newFiles = newlyUploadedFiles.filter(f => !existingIds.has(f.id));
                return [...prev, ...newFiles];
              });
            } else {
              // Single selection - use first uploaded file
              setTempSelectedFiles([newlyUploadedFiles[0]]);
            }
          }
        } catch (error) {
          console.error('Failed to auto-select uploaded files:', error);
        }
      }, 1500);
    }
  };

  const handleFileSelect = (file: FileWithUrls) => {
    console.log('FilePickerModal - handleFileSelect called with file:', file);
    console.log('FilePickerModal - File ID:', file?.id);
    console.log('FilePickerModal - File structure:', {
      id: file?.id,
      filename: file?.filename,
      originalName: file?.originalName,
      mimeType: file?.mimeType,
      filePath: file?.filePath,
      downloadUrl: file?.downloadUrl,
    });
    console.log('FilePickerModal - filterMimeTypes:', filterMimeTypes);
    
    // Validate file object
    if (!file || !file.id) {
      console.error('FilePickerModal - Invalid file object received:', file);
      return;
    }
    
    // Filter by mimeType if filterMimeTypes is specified
    if (filterMimeTypes && filterMimeTypes.length > 0) {
      const matchesFilter = filterMimeTypes.some(filter => {
        if (filter.endsWith('/*')) {
          // Wildcard match (e.g., 'image/*' matches 'image/jpeg')
          const baseType = filter.replace('/*', '');
          return file.mimeType?.startsWith(baseType + '/');
        } else {
          // Exact match
          return file.mimeType === filter;
        }
      });
      
      console.log('FilePickerModal - matchesFilter:', matchesFilter);
      
      if (!matchesFilter) {
        // File doesn't match filter, don't allow selection
        console.log('FilePickerModal - File filtered out, not matching filter');
        return;
      }
    }

    if (multiple) {
      // Toggle file selection
      setTempSelectedFiles(prev => {
        console.log('FilePickerModal - Previous tempSelectedFiles:', prev);
        console.log('FilePickerModal - Previous tempSelectedFiles length:', prev.length);
        const exists = prev.find(f => f.id === file.id);
        if (exists) {
          const newSelection = prev.filter(f => f.id !== file.id);
          console.log('FilePickerModal - Removing file, new selection:', newSelection);
          console.log('FilePickerModal - New selection length:', newSelection.length);
          return newSelection;
        } else {
          const newSelection = [...prev, file];
          console.log('FilePickerModal - Adding file, new selection:', newSelection);
          console.log('FilePickerModal - New selection length:', newSelection.length);
          console.log('FilePickerModal - New selection IDs:', newSelection.map(f => f.id));
          return newSelection;
        }
      });
    } else {
      // Single selection
      console.log('FilePickerModal - Single selection, setting to:', [file]);
      setTempSelectedFiles([file]);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setTempSelectedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDone = () => {
    console.log('FilePickerModal - handleDone called, tempSelectedFiles:', tempSelectedFiles);
    console.log('FilePickerModal - tempSelectedFiles length:', tempSelectedFiles.length);
    console.log('FilePickerModal - tempSelectedFiles IDs:', tempSelectedFiles.map(f => f.id));
    console.log('FilePickerModal - Calling onSelectFiles with:', tempSelectedFiles);
    
    // Ensure we pass a valid array (never undefined or null)
    const filesToPass = Array.isArray(tempSelectedFiles) ? tempSelectedFiles : [];
    console.log('FilePickerModal - Files to pass:', filesToPass);
    
    onSelectFiles(filesToPass);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedFiles(selectedFiles); // Reset to original selection
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:items-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm md:backdrop-blur-sm"
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-white md:rounded-lg shadow-xl w-full h-full md:h-auto md:max-w-6xl md:mx-4 md:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-semibold text-au-grey-text truncate">
              {title || t('publications.selectAttachments')}
            </h2>
            <p className="text-xs md:text-sm text-au-grey-text/70 mt-1">
              {description || (
                tempSelectedFiles.length > 0 
                  ? `${tempSelectedFiles.length} ${tempSelectedFiles.length === 1 ? t('filePicker.file') : t('filePicker.files')} ${t('filePicker.selected')}`
                  : t('filePicker.clickToSelect')
              )}
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-2 md:px-4 py-2 text-xs md:text-sm font-medium text-au-grey-text bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1 md:space-x-2"
            >
              <Upload size={14} className="md:w-4 md:h-4" />
              <span className="hidden sm:inline">{t('common.upload')}</span>
            </button>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={18} className="md:w-5 md:h-5 text-au-grey-text" />
            </button>
          </div>
        </div>

        {/* Selected Files */}
        {tempSelectedFiles.length > 0 && (
          <div className="px-3 md:px-6 py-2 md:py-3 border-b border-gray-200 bg-au-gold/5 flex-shrink-0 overflow-x-auto">
            <div className="flex flex-wrap gap-2">
              {tempSelectedFiles.map(file => (
                <div
                  key={file.id}
                  className="px-2 md:px-3 py-1 bg-white border border-gray-200 rounded-md text-xs text-au-grey-text flex items-center space-x-1 md:space-x-2 flex-shrink-0"
                >
                  <span className="truncate max-w-[120px] md:max-w-[200px]">{file.originalName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(file.id)}
                    className="text-red-500 hover:text-red-700 flex-shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Manager */}
        <div className="flex-1 overflow-hidden min-h-0">
          <FileManager
            onFileSelect={handleFileSelect}
            mode="picker"
            className="w-full h-full"
            allowedMimeTypes={filterMimeTypes}
            selectionLimit={multiple ? undefined : 1}
          />
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 md:p-6 border-t border-gray-200 flex-shrink-0">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSelectUploaded}
              onChange={(e) => setAutoSelectUploaded(e.target.checked)}
              className="w-4 h-4 text-au-corporate-green border-gray-300 rounded focus:ring-au-gold"
            />
            <span className="text-xs md:text-sm text-au-grey-text">
              {t('publications.autoSelectUploaded') || 'Auto-select uploaded files'}
            </span>
          </label>
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <button
              onClick={handleCancel}
              className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-au-grey-text bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex-1 sm:flex-none"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDone}
              className="px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-white bg-au-corporate-green rounded-lg hover:bg-au-corporate-green/90 transition-colors flex-1 sm:flex-none"
            >
              {t('common.done')}
            </button>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadedFileNames([]);
        }}
        onUpload={handleUploadComplete}
        folderId={currentFolder || undefined}
      />
    </div>
  );
}

export default function FilePickerModal(props: FilePickerModalProps) {
  return (
    <Provider store={store}>
      <FilePickerModalContent {...props} />
    </Provider>
  );
}

