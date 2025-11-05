'use client';

import { Provider } from 'react-redux';
import { store } from '@/store';
import FileManager from '@/components/FileManager';
import { FileWithUrls, FolderWithFiles } from '@/types/fileManager';

export default function FilesPage() {
  const handleFileSelect = (file: FileWithUrls) => {
    console.log('File selected:', file);
    // Handle file selection (e.g., open preview, download, etc.)
  };

  const handleFolderSelect = (folder: FolderWithFiles) => {
    console.log('Folder selected:', folder);
    // Handle folder selection (e.g., navigate into folder)
  };

  const handleUpload = (files: FileWithUrls[]) => {
    console.log('Files uploaded:', files);
    // Handle upload completion
  };

  return (
    <Provider store={store}>
      <div className="h-[calc(100vh-8rem)]">
        <FileManager
          onFileSelect={handleFileSelect}
          onFolderSelect={handleFolderSelect}
          onUpload={handleUpload}
          mode="manager"
          className="w-full h-full"
        />
      </div>
    </Provider>
  );
}

