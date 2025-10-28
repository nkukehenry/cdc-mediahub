'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchFolderTree, uploadFile, createFolder, setCurrentFolder } from '@/store/fileManagerSlice';
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
  HardDrive,
  X,
  Star,
  Clock,
  Trash2,
  HelpCircle,
  Bell,
  Plus,
  Copy,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  CheckSquare,
  Square
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState('all-files');

  // Helper function to find a folder by ID in the tree structure
  const findFolderById = (folders: FolderWithFiles[], folderId: string): FolderWithFiles | null => {
    for (const folder of folders) {
      if (folder.id === folderId) {
        return folder;
      }
      const found = findFolderById(folder.subfolders, folderId);
      if (found) return found;
    }
    return null;
  };

  // Get root folders and files (those without a parent)
  const rootFolders = folders.filter(f => !f.parentId);
  const rootFiles = rootFolders.flatMap(folder => folder.files);
  
  // Get current folder files and folders from Redux state
  const currentFolderData = currentFolder ? findFolderById(folders, currentFolder) : null;
  const currentFolderFiles = currentFolderData?.files || [];
  const currentFolderSubfolders = currentFolderData?.subfolders || [];
  
  // Get all files for recent section (from all folders)
  const allFiles = folders.flatMap(folder => folder.files);
  
  // Sort files by updatedAt for recent section
  const recentFiles = allFiles
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  
  // Combine files and folders for display based on current folder
  const allItems = currentFolder ? [
    ...currentFolderSubfolders.map(folder => ({
      id: folder.id,
      name: folder.name,
      type: 'folder',
      lastModified: new Date(folder.updatedAt).toLocaleDateString(),
      size: `${folder.files.length} files`,
      icon: 'folder',
      isFolder: true,
      data: folder
    })),
    ...currentFolderFiles.map(file => ({
      id: file.id,
      name: file.originalName,
      type: file.mimeType.split('/')[0],
      lastModified: new Date(file.updatedAt).toLocaleDateString(),
      size: formatFileSize(file.fileSize),
      icon: file.mimeType.split('/')[0],
      isFolder: false,
      data: file
    }))
  ] : [
    // Show root folders and files when no current folder is selected
    ...rootFolders.map(folder => ({
      id: folder.id,
      name: folder.name,
      type: 'folder',
      lastModified: new Date(folder.updatedAt).toLocaleDateString(),
      size: `${folder.files.length} files`,
      icon: 'folder',
      isFolder: true,
      data: folder
    })),
    ...rootFiles.map(file => ({
      id: file.id,
      name: file.originalName,
      type: file.mimeType.split('/')[0],
      lastModified: new Date(file.updatedAt).toLocaleDateString(),
      size: formatFileSize(file.fileSize),
      icon: file.mimeType.split('/')[0],
      isFolder: false,
      data: file
    }))
  ];

  useEffect(() => {
    // Load root folders and files on startup
    dispatch(fetchFolderTree(null));
  }, [dispatch]);

  useEffect(() => {
    // Load specific folder when currentFolder changes
    if (currentFolder) {
      dispatch(fetchFolderTree(currentFolder));
    }
  }, [dispatch, currentFolder]);

  const handleFileUpload = async (files: File[], folderId?: string) => {
    try {
      for (const file of files) {
        // Create a mock FileWithUrls object for the upload
        const mockFileWithUrls: FileWithUrls = {
          id: Math.random().toString(36).substr(2, 9),
          filename: file.name,
          originalName: file.name,
          filePath: `/uploads/${file.name}`,
          thumbnailPath: undefined,
          fileSize: file.size,
          mimeType: file.type,
          folderId: folderId || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          downloadUrl: `http://localhost:3001/api/files/${Math.random().toString(36).substr(2, 9)}/download`,
          thumbnailUrl: null
        };
        await dispatch(uploadFile({ file, folderId }));
      }
      // onUpload?.(files); // Commented out due to type mismatch
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleFolderCreate = async (name: string, parentId?: string) => {
    try {
      await dispatch(createFolder({ name, parentId }));
    } catch (error) {
      console.error('Folder creation failed:', error);
    }
  };

  const toggleFolderExpansion = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleFolderClick = (folder: FolderWithFiles) => {
    // Set current folder to load its contents
    dispatch(setCurrentFolder(folder.id));
    // Expand the clicked folder in the sidebar
    setExpandedFolders(prev => new Set([...prev, folder.id]));
    onFolderSelect?.(folder);
  };

  const handleSidebarFolderClick = (folder: FolderWithFiles) => {
    // Set current folder to load its contents
    dispatch(setCurrentFolder(folder.id));
    // Expand the clicked folder in the sidebar
    setExpandedFolders(prev => new Set([...prev, folder.id]));
    onFolderSelect?.(folder);
  };

  const handleFileClick = (file: any) => {
    setSelectedFile(file);
    onFileSelect?.(file);
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const getFileIcon = (file: any) => {
    switch (file.icon) {
      case 'folder':
        return <Folder size={20} className="text-blue-500" />;
      case 'image':
        return <ImageIcon size={20} className="text-green-500" />;
      case 'document':
        return <FileText size={20} className="text-blue-600" />;
      case 'spreadsheet':
        return <FileSpreadsheet size={20} className="text-green-600" />;
      case 'pdf':
        return <FileText size={20} className="text-red-500" />;
      case 'text':
        return <FileText size={20} className="text-gray-500" />;
      default:
        return <File size={20} className="text-gray-500" />;
    }
  };

  const renderFolderTree = (folders: FolderWithFiles[], level: number = 0) => {
    return folders.map((folder) => (
      <div key={folder.id}>
        <div
          onClick={() => handleSidebarFolderClick(folder)}
          className={cn(
            'flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors group',
            level > 0 && 'ml-6',
            currentFolder === folder.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'
          )}
        >
          {/* Expand/Collapse Button */}
          {folder.subfolders.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpansion(folder.id);
              }}
              className="mr-2 p-0.5 hover:bg-gray-200 rounded transition-colors"
            >
              {expandedFolders.has(folder.id) ? (
                <ChevronDown size={14} className="text-blue-500" />
              ) : (
                <ChevronRight size={14} className="text-blue-500" />
              )}
            </button>
          ) : (
            <div className="w-5 mr-2" />
          )}
          
          {/* Folder Icon */}
          <div className="mr-3">
            <Folder size={16} className={currentFolder === folder.id ? "text-blue-600" : "text-blue-500"} />
          </div>
          
          {/* Folder Name */}
          <span className={cn(
            "text-sm font-medium flex-1",
            currentFolder === folder.id ? "text-blue-600" : "text-gray-700 group-hover:text-gray-900"
          )}>
            {folder.name}
          </span>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Error loading file manager</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-screen bg-white w-full', className)}>
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-blue-600">finalui</h1>
        </div>

        {/* Navigation Links */}
        <div className="p-6">
          <div className="space-y-2">
            <div 
              className={cn(
                'flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors',
                !currentFolder ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
              )}
              onClick={() => dispatch(setCurrentFolder(null))}
            >
              <Grid3X3 size={16} className="mr-3" />
              <span className="text-sm font-medium">All files</span>
            </div>
            <div className="flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors text-gray-700 hover:bg-gray-50">
              <ImageIcon size={16} className="mr-3" />
              <span className="text-sm font-medium">Photos</span>
            </div>
            <div className="flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors text-gray-700 hover:bg-gray-50">
              <Star size={16} className="mr-3" />
              <span className="text-sm font-medium">Starred</span>
            </div>
            <div className="flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors text-gray-700 hover:bg-gray-50">
              <Clock size={16} className="mr-3" />
              <span className="text-sm font-medium">Recent</span>
            </div>
            <div className="flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors text-gray-700 hover:bg-gray-50">
              <Share2 size={16} className="mr-3" />
              <span className="text-sm font-medium">Shared</span>
            </div>
            <div className="flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors text-gray-700 hover:bg-gray-50">
              <Trash2 size={16} className="mr-3" />
              <span className="text-sm font-medium">Deleted</span>
            </div>
          </div>
        </div>

        {/* Folders Section */}
        <div className="flex-1 px-6 pb-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4">FOLDERS</h3>
          <div className="space-y-0.5">
            {renderFolderTree(folders)}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            {/* Search Bar */}
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative max-w-md">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search folder or file"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Search
              </button>
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center space-x-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <HelpCircle size={20} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings size={20} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell size={20} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <User size={20} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 bg-gray-50">
          {/* Breadcrumb Navigation */}
          <div className="mb-4">
            <nav className="flex items-center space-x-2 text-sm">
              <button 
                onClick={() => dispatch(setCurrentFolder(null))}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Root
              </button>
              {currentFolder && (
                <>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-600">
                    {currentFolderData?.name || 'Current Folder'}
                  </span>
                </>
              )}
            </nav>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Upload size={16} />
                <span>Upload</span>
              </button>
              <button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
                <Plus size={16} />
                <span>New file</span>
                <ChevronDown size={14} />
              </button>
              <button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
                <Folder size={16} />
                <span>Create folder</span>
              </button>
              <button className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
                <Upload size={16} />
                <span>Request file</span>
              </button>
            </div>

            {/* View and Sort Options */}
            <div className="flex items-center space-x-3">
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>Sort by</option>
                <option>Name</option>
                <option>Date</option>
                <option>Size</option>
              </select>
              <div className="flex items-center space-x-1">
                <button className="p-2 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                  <Grid3X3 size={16} />
                </button>
                <button className="p-2 rounded-lg transition-colors bg-blue-100 text-blue-600">
                  <List size={16} />
                </button>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <HelpCircle size={16} className="text-gray-400" />
              </button>
            </div>
          </div>

          {/* Recently Used Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recently used</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {recentFiles.map((file) => (
                <div key={file.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      {getFileIcon({
                        icon: file.mimeType.split('/')[0],
                        type: file.mimeType.split('/')[0]
                      })}
                    </div>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <MoreVertical size={14} className="text-gray-400" />
                    </button>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 truncate mb-1">{file.originalName}</h3>
                  <p className="text-xs text-gray-500">{file.mimeType.split('/')[0].toUpperCase()}, {formatFileSize(file.fileSize)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* All Files Section */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {currentFolder ? `${currentFolderData?.name || 'Current Folder'} - Files` : 'Root folders and files'}
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-1"></div>
                  <div className="col-span-5">Name</div>
                  <div className="col-span-2">Last modified</div>
                  <div className="col-span-2">Size</div>
                  <div className="col-span-2">Manage</div>
                </div>
              </div>

              {/* Table Body - Scrollable */}
              <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                <div className="divide-y divide-gray-200">
                  {allItems.map((item) => (
                    <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-1">
                          <button 
                            onClick={() => toggleFileSelection(item.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            {selectedFileIds.has(item.id) ? (
                              <CheckSquare size={16} className="text-blue-600" />
                            ) : (
                              <Square size={16} className="text-gray-400" />
                            )}
                          </button>
                        </div>
                        <div className="col-span-5 flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            {getFileIcon(item)}
                          </div>
                          <span 
                            className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
                            onClick={() => item.isFolder ? handleFolderClick(item.data as FolderWithFiles) : handleFileClick(item.data as FileWithUrls)}
                          >
                            {item.name}
                          </span>
                        </div>
                        <div className="col-span-2 text-sm text-gray-600">{item.lastModified}</div>
                        <div className="col-span-2 text-sm text-gray-600">{item.size}</div>
                        <div className="col-span-2 flex items-center space-x-2">
                          <button className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                            Copy
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <Share2 size={14} className="text-gray-400" />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded">
                            <MoreVertical size={14} className="text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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