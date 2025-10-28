'use client';

import { Provider } from 'react-redux';
import { store } from '@/store';
import FileManager from '@/components/FileManager';
import { FileWithUrls, FolderWithFiles } from '@/types/fileManager';

export default function Home() {
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
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">File Manager Demo</h1>
            <p className="mt-2 text-gray-600">
              A modular file manager with grid and list views, drag-and-drop upload, and mobile responsiveness.
            </p>
          </div>
          
          <FileManager
            onFileSelect={handleFileSelect}
            onFolderSelect={handleFolderSelect}
            onUpload={handleUpload}
            mode="manager"
            className="max-w-full"
          />
        </div>
      </div>
    </Provider>
  );
}