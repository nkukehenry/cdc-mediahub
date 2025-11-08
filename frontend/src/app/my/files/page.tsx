'use client';

import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { useRouter } from 'next/navigation';
import { store } from '@/store';
import FileManager from '@/components/FileManager';
import { FileWithUrls, FolderWithFiles } from '@/types/fileManager';
import { useAuth } from '@/hooks/useAuth';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export default function MyFilesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login?redirect=/my/files');
    }
  }, [loading, user, router]);

  if (!user && !loading) {
    return null;
  }

  const handleFileSelect = (_file: FileWithUrls) => {
    // Additional actions can be added here in the future.
  };

  const handleFolderSelect = (_folder: FolderWithFiles) => {
    // Additional actions can be added here in the future.
  };

  const handleUpload = (_files: FileWithUrls[]) => {
    // Additional actions can be added here in the future.
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <PublicNav />
      <div className="flex-1">
        <Provider store={store}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-au-grey-text">My Files</h1>
              <p className="text-sm text-au-grey-text/70 mt-1">
                Upload, organize, and manage the files associated with your publications.
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm h-[70vh] flex flex-col">
              <div className="flex-1 overflow-y-auto rounded-b-xl">
                <FileManager
                  onFileSelect={handleFileSelect}
                  onFolderSelect={handleFolderSelect}
                  onUpload={handleUpload}
                  mode="manager"
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </Provider>
      </div>
      <PublicFooter />
    </div>
  );
}
