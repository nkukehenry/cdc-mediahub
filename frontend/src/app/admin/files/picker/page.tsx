'use client';

import { useState } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import FileManager from '@/components/FileManager';
import { FileWithUrls, FolderWithFiles } from '@/types/fileManager';
import { CheckCircle2, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

export default function FilePickerTestPage() {
  const { t } = useTranslation();
  const [selectedFiles, setSelectedFiles] = useState<FileWithUrls[]>([]);
  const [showSelected, setShowSelected] = useState(false);

  const handleFileSelect = (file: FileWithUrls) => {
    console.log('File selected:', file);
    // Add to selected files if not already selected
    setSelectedFiles(prev => {
      if (prev.find(f => f.id === file.id)) {
        return prev.filter(f => f.id !== file.id);
      }
      return [...prev, file];
    });
  };

  const handleFolderSelect = (folder: FolderWithFiles) => {
    console.log('Folder selected:', folder);
    // In picker mode, clicking a folder should navigate into it
  };

  const handleConfirmSelection = () => {
    console.log('Selected files:', selectedFiles);
    alert(`Selected ${selectedFiles.length} file(s):\n${selectedFiles.map(f => f.originalName).join('\n')}`);
  };

  const handleClearSelection = () => {
    setSelectedFiles([]);
  };

  return (
    <Provider store={store}>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-au-grey-text">{t('filePicker.filePickerTest')}</h1>
            <p className="text-sm text-au-grey-text/70 mt-1">
              {t('filePicker.filePickerTestDescription')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {selectedFiles.length > 0 && (
              <>
                <button
                  onClick={handleClearSelection}
                  className="px-4 py-2 text-sm font-medium text-au-grey-text bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                >
                  <X size={16} />
                  <span>{t('filePicker.clearSelection')} ({selectedFiles.length})</span>
                </button>
                <button
                  onClick={handleConfirmSelection}
                  className="px-4 py-2 text-sm font-medium text-white bg-au-corporate-green rounded-lg hover:bg-au-corporate-green/90 transition-colors flex items-center space-x-2"
                >
                  <CheckCircle2 size={16} />
                  <span>{t('filePicker.confirmSelection')} ({selectedFiles.length})</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Selected Files Display */}
        {selectedFiles.length > 0 && (
          <div className="bg-au-gold/5 border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-au-grey-text">
                {selectedFiles.length} {t('filePicker.filesSelected')}
              </span>
              <button
                onClick={() => setShowSelected(!showSelected)}
                className="text-xs text-au-grey-text/70 hover:text-au-grey-text"
              >
                {showSelected ? t('filePicker.hideSelectedFiles') : t('filePicker.showSelectedFiles')}
              </button>
            </div>
            {showSelected && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedFiles.map(file => (
                  <div
                    key={file.id}
                    className="px-3 py-1 bg-white border border-gray-200 rounded-md text-xs text-au-grey-text flex items-center space-x-2"
                  >
                    <span>{file.originalName}</span>
                    <button
                      onClick={() => setSelectedFiles(prev => prev.filter(f => f.id !== file.id))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* File Manager in Picker Mode */}
        <div className="flex-1 overflow-hidden">
          <FileManager
            onFileSelect={handleFileSelect}
            onFolderSelect={handleFolderSelect}
            mode="picker"
            className="w-full h-full"
          />
        </div>
      </div>
    </Provider>
  );
}

