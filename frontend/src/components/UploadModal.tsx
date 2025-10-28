'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File as FileIcon, X, CheckCircle, AlertCircle } from 'lucide-react';
import { UploadZoneProps } from '@/types/fileManager';
import { cn, validateFileType, validateFileSize, formatFileSize } from '@/utils/fileUtils';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], folderId?: string) => Promise<void>;
  folderId?: string;
  disabled?: boolean;
}

interface UploadFile extends File {
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export default function UploadModal({ isOpen, onClose, onUpload, folderId, disabled = false }: UploadModalProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    console.log('Files dropped:', acceptedFiles);
    console.log('Number of files:', acceptedFiles.length);
    
    const newFiles: UploadFile[] = acceptedFiles.map((file, index) => {
      console.log(`File ${index + 1} details:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        webkitRelativePath: file.webkitRelativePath,
        // Log all properties
        allProperties: Object.keys(file),
        // Check if it's actually a File object
        isFile: file instanceof window.File,
        constructor: file.constructor.name
      });
      
      return {
        ...file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending',
        progress: 0,
      };
    });
    
    console.log('Processed files:', newFiles);
    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: disabled || isUploading,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md', '.json'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDropAccepted: (files) => {
      console.log('Files accepted by dropzone:', files);
    },
    onDropRejected: (fileRejections) => {
      console.log('Files rejected by dropzone:', fileRejections);
    },
  });

  const removeFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    
    setIsUploading(true);
    
    try {
      let hasErrors = false;
      
      // Upload each file
      for (const file of uploadFiles) {
        setUploadFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'uploading', progress: 0 } : f
        ));
        
        try {
          console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
          // Call the actual upload function for each file
          await onUpload([file], folderId);
          
          // Mark as success
          setUploadFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, status: 'success', progress: 100 } : f
          ));
        } catch (error) {
          console.error('Upload error for file:', file.name, error);
          hasErrors = true;
          // Mark as error
          setUploadFiles(prev => prev.map(f => 
            f.id === file.id ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed' 
            } : f
          ));
        }
      }
      
      // Close modal after a delay if all uploads succeeded
      if (!hasErrors) {
        setTimeout(() => {
          setUploadFiles([]);
          setIsUploading(false);
          onClose();
        }, 1000);
      } else {
        setIsUploading(false);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setUploadFiles([]);
      onClose();
    }
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
            disabled={isUploading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
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
              isDragActive && 'border-blue-500 bg-blue-50',
              (disabled || isUploading) && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input {...getInputProps()} />
            
            <div className="flex flex-col items-center space-y-4">
              {isDragActive ? (
                <>
                  <File size={48} className="text-blue-500" />
                  <p className="text-blue-600 font-medium text-lg">Drop files here</p>
                </>
              ) : (
                <>
                  <Upload size={48} className="text-gray-400" />
                  <div>
                    <p className="text-gray-600 font-medium text-lg">Drop files here or click to browse</p>
                    <p className="text-gray-500 text-sm mt-1">Supports images, PDFs, and text files (max 10MB)</p>
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
                {uploadFiles.map((file) => (
                  <div key={file.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 mr-3">
                      {file.status === 'success' ? (
                        <CheckCircle size={20} className="text-green-500" />
                      ) : file.status === 'error' ? (
                        <AlertCircle size={20} className="text-red-500" />
                      ) : (
                        <FileIcon size={20} className="text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                        {(() => {
                          console.log('Rendering file name:', file.name);
                          return file.name || 'Unknown file';
                        })()}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{(() => {
                          const size = file.size && file.size > 0 ? formatFileSize(file.size) : 'Unknown size';
                          console.log('File size calculation:', file.size, '->', size);
                          return size;
                        })()}</span>
                        <span>•</span>
                        <span>{(() => {
                          const type = file.type || 'Unknown type';
                          console.log('File type:', file.type, '->', type);
                          return type;
                        })()}</span>
                      </div>
                      
                      {/* Progress Bar */}
                      {file.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${file.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{file.progress}%</p>
                        </div>
                      )}
                      
                      {/* Error Message */}
                      {file.status === 'error' && file.error && (
                        <p className="text-xs text-red-600 mt-1">{file.error}</p>
                      )}
                    </div>
                    
                    {!isUploading && (
                      <button
                        onClick={() => removeFile(file.id)}
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
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={() => {
              console.log('Current upload files:', uploadFiles);
              uploadFiles.forEach((file, index) => {
                console.log(`Debug file ${index}:`, {
                  name: file.name,
                  size: file.size,
                  type: file.type,
                  id: file.id,
                  status: file.status,
                  allKeys: Object.keys(file)
                });
              });
            }}
            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
          >
            Debug Files
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploadFiles.length === 0 || isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : `Upload ${uploadFiles.length} file${uploadFiles.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
