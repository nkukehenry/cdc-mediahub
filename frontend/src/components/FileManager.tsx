'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchFolderTree, uploadFile, createFolder } from '@/store/fileManagerSlice';
import { FileManagerProps, FileWithUrls, FolderWithFiles } from '@/types/fileManager';
import { cn, formatFileSize, getFileIcon, isImageFile } from '@/utils/fileUtils';

// Components
import UploadModal from './UploadModal';
import { 
  Upload, 
  RefreshCw, 
  Share2, 
  User, 
  Settings, 
  Search,
  Grid3X3,
  List,
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  HardDrive
} from 'lucide-react';

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

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileWithUrls | null>(null);
  const [sidebarFolders, setSidebarFolders] = useState<FolderWithFiles[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [currentFolderFiles, setCurrentFolderFiles] = useState<FileWithUrls[]>([]);

  useEffect(() => {
    dispatch(fetchFolderTree(currentFolder));
  }, [dispatch, currentFolder]);

  useEffect(() => {
    // Set sidebar folders (root level folders for navigation)
    dispatch(fetchFolderTree(null)).then((result) => {
      if (fetchFolderTree.fulfilled.match(result)) {
        setSidebarFolders(result.payload);
      }
    });
  }, [dispatch]);

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

  const toggleFolderExpansion = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFolderClick = (folder: FolderWithFiles) => {
    onFolderSelect?.(folder);
    dispatch({ type: 'fileManager/setCurrentFolder', payload: folder.id });
    dispatch({ type: 'fileManager/setCurrentPath', payload: [...currentPath, folder.name] });
    setCurrentFolderFiles(folder.files);
    setSelectedFile(null); // Clear file selection when navigating to folder
  };

  const handleSidebarFolderClick = (folder: FolderWithFiles) => {
    // Toggle expansion first
    toggleFolderExpansion(folder.id);
    
    // Then navigate to folder
    handleFolderClick(folder);
  };

  const getCurrentFolderName = () => {
    if (currentPath.length === 0) return 'My Files';
    return currentPath[currentPath.length - 1];
  };

  const getAllFiles = () => {
    return folders.flatMap(folder => folder.files);
  };

  const getAllFolders = () => {
    return folders;
  };

  const renderFolderTree = (folders: FolderWithFiles[], level: number = 0) => {
    return folders.map((folder) => (
      <div key={folder.id}>
        <div
          onClick={() => handleSidebarFolderClick(folder)}
          className={cn(
            'flex items-center p-2 rounded-lg cursor-pointer transition-colors',
            currentFolder === folder.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50',
            level > 0 && 'ml-4'
          )}
        >
          {folder.subfolders.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpansion(folder.id);
              }}
              className="mr-1 p-1 hover:bg-gray-200 rounded"
            >
              {expandedFolders.has(folder.id) ? (
                <ChevronDown size={12} className="text-gray-400" />
              ) : (
                <ChevronRight size={12} className="text-gray-400" />
              )}
            </button>
          ) : (
            <div className="w-4 mr-1" />
          )}
          
          {expandedFolders.has(folder.id) ? (
            <FolderOpen size={16} className="text-yellow-500 mr-3" />
          ) : (
            <Folder size={16} className="text-yellow-500 mr-3" />
          )}
          
          <span className="text-sm font-medium flex-1">{folder.name}</span>
          <span className="text-xs text-gray-400">{folder.files.length}</span>
        </div>
        
        {/* Render subfolders if expanded */}
        {expandedFolders.has(folder.id) && folder.subfolders.length > 0 && (
          <div className="ml-2">
            {renderFolderTree(folder.subfolders, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const handleFileClick = (file: FileWithUrls) => {
    setSelectedFile(file);
    onFileSelect?.(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-600 text-center">
          <p className="text-lg font-medium">Error loading file manager</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-screen bg-white rounded-lg shadow-lg', className)}>
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* User Profile Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Hey, User</p>
              <button className="text-sm text-blue-600 hover:text-blue-700">Upgrade</button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>374.0 GB</span>
              <span>2048 GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '18%' }}></div>
            </div>
          </div>
        </div>

        {/* My Folders */}
        <div className="flex-1 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">My Folders</h3>
          <div className="space-y-1">
            {renderFolderTree(sidebarFolders)}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-semibold text-gray-900">{getCurrentFolderName()}</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Upload"
              >
                <Upload size={20} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
                <RefreshCw size={20} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Share">
                <Share2 size={20} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Settings">
                <Settings size={20} className="text-gray-600" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* Files Area */}
          <div className="flex-1 p-6">
            {/* Sub-folders */}
            {getAllFolders().length > 0 && (
              <div className="mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getAllFolders().map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => handleFolderClick(folder)}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Folder size={24} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{folder.name}</h3>
                          <p className="text-sm text-gray-500">{folder.files.length} files</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files Section */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Files</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => dispatch({ type: 'fileManager/setViewMode', payload: 'list' })}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => dispatch({ type: 'fileManager/setViewMode', payload: 'grid' })}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  <Grid3X3 size={16} />
                </button>
              </div>
            </div>

            {/* Files Grid/List */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {currentFolderFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    className={cn(
                      'bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer',
                      selectedFile?.id === file.id ? 'ring-2 ring-blue-500' : ''
                    )}
                  >
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-lg flex items-center justify-center">
                        {isImageFile(file.mimeType) && file.thumbnailUrl ? (
                          <img 
                            src={file.thumbnailUrl} 
                            alt={file.originalName}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <span className="text-2xl">{getFileIcon(file.mimeType)}</span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 truncate" title={file.originalName}>
                        {file.originalName}
                      </h3>
                      <p className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {currentFolderFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    className={cn(
                      'flex items-center p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer',
                      selectedFile?.id === file.id ? 'ring-2 ring-blue-500' : ''
                    )}
                  >
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                      {isImageFile(file.mimeType) && file.thumbnailUrl ? (
                        <img 
                          src={file.thumbnailUrl} 
                          alt={file.originalName}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <span className="text-lg">{getFileIcon(file.mimeType)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{file.originalName}</h3>
                      <p className="text-xs text-gray-500">{formatFileSize(file.fileSize)} • {file.mimeType}</p>
                    </div>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <MoreVertical size={16} className="text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {currentFolderFiles.length === 0 && getAllFolders().length === 0 && (
              <div className="text-center py-12">
                <HardDrive size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No files found</h3>
                <p className="text-gray-500 mb-4">Upload files or create folders to get started</p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Files
                </button>
              </div>
            )}
          </div>

          {/* Right Details Panel */}
          {selectedFile && (
            <div className="w-80 bg-white border-l border-gray-200 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 truncate" title={selectedFile.originalName}>
                  {selectedFile.originalName}
                </h3>
                <div className="flex space-x-2 mt-2">
                  <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm">Properties</button>
                  <button className="px-3 py-1 text-gray-500 rounded text-sm">History</button>
                </div>
              </div>

              {/* File Preview */}
              {isImageFile(selectedFile.mimeType) && selectedFile.thumbnailUrl && (
                <div className="mb-6">
                  <img 
                    src={selectedFile.thumbnailUrl} 
                    alt={selectedFile.originalName}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}

              {/* Properties */}
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Properties</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="text-gray-900">{selectedFile.mimeType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Size:</span>
                      <span className="text-gray-900">{formatFileSize(selectedFile.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location:</span>
                      <span className="text-gray-900">{getCurrentFolderName()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created:</span>
                      <span className="text-gray-900">{new Date(selectedFile.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Download Link */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Link for download</h4>
                  <div className="p-2 bg-gray-50 rounded text-xs text-gray-600 break-all">
                    {selectedFile.downloadUrl}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleFileUpload}
        folderId={currentFolder || undefined}
      />
    </div>
  );
}