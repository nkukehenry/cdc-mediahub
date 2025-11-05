'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File as FileIcon, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn, validateFileType, validateFileSize, formatFileSize } from '@/utils/fileUtils';
import { useTranslation } from '@/hooks/useTranslation';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], folderId?: string) => Promise<void>;
  folderId?: string;
  disabled?: boolean;
}

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MAX_FILE_SIZE_MB = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || '50');
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function UploadModal({ isOpen, onClose, onUpload, folderId, disabled = false }: UploadModalProps) {
  const { t } = useTranslation();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Reset files when modal closes
  useEffect(() => {
    if (!isOpen) {
      setUploadFiles([]);
      setIsUploading(false);
    }
  }, [isOpen]);

  const uploadFileWithProgress = useCallback(async (uploadFile: UploadFile): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      if (folderId) formData.append('folderId', folderId);

      // Get token
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, progress, status: 'uploading' as const }
              : f
          ));
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, progress: 100, status: 'success' as const }
              : f
          ));
          resolve();
        } else {
          const error = xhr.responseText ? JSON.parse(xhr.responseText) : { message: t('errors.uploadFailed') };
          setUploadFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'error' as const, error: error.error?.message || t('errors.uploadFailed') }
              : f
          ));
          reject(new Error(error.error?.message || t('errors.uploadFailed')));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'error' as const, error: t('errors.networkError') }
            : f
        ));
        reject(new Error(t('errors.networkError')));
      });

      // Open and send request
      xhr.open('POST', `${API_BASE_URL}/api/files/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  }, [folderId]);

  const handleUpload = useCallback(async () => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);

    try {
      // Upload all pending files
      await Promise.allSettled(pendingFiles.map(file => uploadFileWithProgress(file)));
      
      // Wait a bit for state updates, then notify parent component
      setTimeout(async () => {
        setUploadFiles(currentFiles => {
          const successfulFiles = currentFiles.filter(f => f.status === 'success').map(f => f.file);
          if (successfulFiles.length > 0) {
            onUpload(successfulFiles, folderId).catch(console.error);
          }
          return currentFiles;
        });

        // Close modal after showing success state
        setTimeout(() => {
          setUploadFiles([]);
          setIsUploading(false);
          onClose();
        }, 1000);
      }, 500);
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
    }
  }, [uploadFiles, uploadFileWithProgress, onUpload, folderId, onClose]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending' as const,
      progress: 0,
    }));
    
    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: disabled,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md', '.json'],
      // Allow all common videos and audios (any format)
      'video/*': [],
      'audio/*': [],
      // Common office and open document formats
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/rtf': ['.rtf'],
      'application/vnd.oasis.opendocument.text': ['.odt'],
      'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
      'application/vnd.oasis.opendocument.presentation': ['.odp'],
    },
    maxSize: MAX_FILE_SIZE_BYTES,
    onDropRejected: (fileRejections) => {
      setUploadFiles(prev => ([
        ...prev,
        ...fileRejections.map(r => ({
          id: `${r.file.name}-${r.file.size}-${Date.now()}-${Math.random()}`,
          file: r.file,
          status: 'error' as const,
          progress: 0,
          error: r.errors?.[0]?.message || t('errors.fileRejected'),
        }))
      ]));
    }
  });

  const removeFile = (fileId: string) => {
    // Only allow removing pending files
    setUploadFiles(prev => prev.filter(file => {
      if (file.id === fileId && file.status !== 'pending') {
        return true; // Keep files that are uploading/success/error
      }
      return file.id !== fileId; // Remove the file if it's the one to remove and is pending
    }));
  };

  const handleClose = () => {
    if (isUploading) return; // Prevent closing during upload
    setUploadFiles([]);
    setIsUploading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Translucent backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Drop Zone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center transition-colors cursor-pointer',
              isDragActive && 'border-au-green bg-au-gold/10',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center space-y-4">
              {isDragActive ? (
                <>
                  <FileIcon size={48} className="text-au-green" />
                  <p className="text-au-green font-medium text-lg">Drop files here</p>
                </>
              ) : (
                <>
                  <Upload size={48} className="text-gray-400" />
                  <div>
                    <p className="text-gray-600 font-medium text-lg">Drop files here or click to browse</p>
                    <p className="text-gray-500 text-sm mt-1">Supports images, videos, audios, documents (PDF, Word, Excel, PowerPoint, OpenDocument), and text files (max {MAX_FILE_SIZE_MB}MB)</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* File List */}
          {uploadFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Files to upload ({uploadFiles.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {uploadFiles.map((uploadFile) => (
                  <div key={uploadFile.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 mr-3">
                      {uploadFile.status === 'success' ? (
                        <CheckCircle size={20} className="text-green-500" />
                      ) : uploadFile.status === 'error' ? (
                        <AlertCircle size={20} className="text-red-500" />
                      ) : (
                        <FileIcon size={20} className="text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate" title={uploadFile.file.name}>
                        {uploadFile.file.name || 'Unknown file'}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{uploadFile.file.size && uploadFile.file.size > 0 ? formatFileSize(uploadFile.file.size) : 'Unknown size'}</span>
                        <span>•</span>
                        <span>{uploadFile.file.type || 'Unknown type'}</span>
                      </div>
                      
                      {/* Progress Bar - Show for uploading or if progress > 0 */}
                      {(uploadFile.status === 'uploading' || (uploadFile.progress > 0 && uploadFile.progress < 100)) && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-au-green h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadFile.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{uploadFile.progress}%</p>
                        </div>
                      )}
                      
                      {/* Success State */}
                      {uploadFile.status === 'success' && (
                        <p className="text-xs text-green-600 mt-1">Upload complete</p>
                      )}
                      
                      {/* Error Message */}
                      {uploadFile.status === 'error' && uploadFile.error && (
                        <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                      )}
                    </div>
                    
                    {uploadFile.status === 'pending' && (
                      <button
                        onClick={() => removeFile(uploadFile.id)}
                        className="ml-3 p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <X size={16} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Cancel'}
          </button>
          {uploadFiles.filter(f => f.status === 'pending').length > 0 && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-au-white bg-au-green rounded-lg hover:bg-au-corporate-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading 
                ? 'Uploading...' 
                : `Upload ${uploadFiles.filter(f => f.status === 'pending').length} file${uploadFiles.filter(f => f.status === 'pending').length !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
