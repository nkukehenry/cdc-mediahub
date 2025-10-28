'use client';

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchFolderTree, uploadFile, createFolder } from '@/store/fileManagerSlice';
import { FileManagerProps } from '@/types/fileManager';
import { cn } from '@/utils/fileUtils';

// Components
import Breadcrumb from './Breadcrumb';
import SearchBar from './SearchBar';
import ViewToggle from './ViewToggle';
import UploadZone from './UploadZone';
import FolderGrid from './FolderGrid';
import FolderList from './FolderList';
import FileGrid from './FileGrid';
import FileList from './FileList';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

export default function FileManager({ 
  config, 
  onFileSelect, 
  onFolderSelect, 
  onUpload,
  className,
  mode = 'manager'
}: FileManagerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { 
    folders, 
    currentFolder, 
    currentPath, 
    viewMode, 
    loading, 
    error,
    selectedFiles 
  } = useSelector((state: RootState) => state.fileManager);

  useEffect(() => {
    dispatch(fetchFolderTree(currentFolder));
  }, [dispatch, currentFolder]);

  const handleFileUpload = async (files: File[]) => {
    for (const file of files) {
      try {
        const result = await dispatch(uploadFile({ file, folderId: currentFolder || undefined }));
        if (uploadFile.fulfilled.match(result)) {
          onUpload?.(result.payload);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
    // Refresh folder tree after uploads
    dispatch(fetchFolderTree(currentFolder));
  };

  const handleCreateFolder = async (name: string) => {
    try {
      const result = await dispatch(createFolder({ name, parentId: currentFolder || undefined }));
      if (createFolder.fulfilled.match(result)) {
        // Refresh folder tree after creation
        dispatch(fetchFolderTree(currentFolder));
      }
    } catch (error) {
      console.error('Create folder failed:', error);
    }
  };

  const handleFolderDoubleClick = (folder: any) => {
    onFolderSelect?.(folder);
    // Navigate into folder
    dispatch({ type: 'fileManager/setCurrentFolder', payload: folder.id });
    dispatch({ type: 'fileManager/setCurrentPath', payload: [...currentPath, folder.name] });
  };

  const handleFileDoubleClick = (file: any) => {
    onFileSelect?.(file);
  };

  const handleBreadcrumbNavigate = (index: number) => {
    if (index === -1) {
      // Navigate to root
      dispatch({ type: 'fileManager/setCurrentFolder', payload: null });
      dispatch({ type: 'fileManager/setCurrentPath', payload: [] });
    } else {
      // Navigate to specific folder
      const targetPath = currentPath.slice(0, index + 1);
      dispatch({ type: 'fileManager/setCurrentPath', payload: targetPath });
      // Find folder ID from path
      // This would need to be implemented based on your folder structure
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className={cn('file-manager bg-white rounded-lg shadow-lg', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <Breadcrumb 
            path={currentPath} 
            onNavigate={handleBreadcrumbNavigate}
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <SearchBar 
            query=""
            onSearch={(query) => dispatch({ type: 'fileManager/setSearchQuery', payload: query })}
          />
          <ViewToggle 
            mode={viewMode}
            onModeChange={(mode) => dispatch({ type: 'fileManager/setViewMode', payload: mode })}
          />
        </div>
      </div>

      {/* Upload Zone */}
      <UploadZone 
        onUpload={handleFileUpload}
        folderId={currentFolder || undefined}
        className="border-b"
      />

      {/* Content */}
      <div className="p-4">
        {/* Folders */}
        {folders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Folders</h3>
            {viewMode === 'grid' ? (
              <FolderGrid 
                folders={folders}
                onDoubleClick={handleFolderDoubleClick}
              />
            ) : (
              <FolderList 
                folders={folders}
                onDoubleClick={handleFolderDoubleClick}
              />
            )}
          </div>
        )}

        {/* Files */}
        {folders.some(folder => folder.files.length > 0) && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Files</h3>
            {viewMode === 'grid' ? (
              <FileGrid 
                folders={folders}
                onDoubleClick={handleFileDoubleClick}
              />
            ) : (
              <FileList 
                folders={folders}
                onDoubleClick={handleFileDoubleClick}
              />
            )}
          </div>
        )}

        {/* Empty State */}
        {folders.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-2">No folders found</div>
            <div className="text-gray-500 text-sm">Upload files or create folders to get started</div>
          </div>
        )}
      </div>
    </div>
  );
}
