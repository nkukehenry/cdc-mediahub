'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchFolderTree, uploadFile, createFolder, setCurrentFolder, deleteFile, deleteFolder, setFoldersSilently, setViewMode } from '@/store/fileManagerSlice';
import { FileManagerProps, FileWithUrls, FolderWithFiles } from '@/types/fileManager';
import { cn, formatFileSize, getFileIcon, isImageFile } from '@/utils/fileUtils';
import { apiClient } from '@/utils/apiClient';
import { useTranslation } from '@/hooks/useTranslation';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useFileUpload } from '@/hooks/useFileUpload';

// Components
import UploadModal from './UploadModal';
import CreateFolderModal from './CreateFolderModal';
import FilePreviewModal from './FilePreviewModal';
import ShareModal from './ShareModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import MoveModal from './MoveModal';
import RenameFileModal from './RenameFileModal';
import EmptyState from './EmptyState';
import FileManagerNav from './file-manager/FileManagerNav';
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
  Home,
  ChevronDown,
  MoreVertical,
  HardDrive,
  X,
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
  Square,
  Move
} from 'lucide-react';
import FileListRow from './FileListRow';
import FileGridCard from './FileGridCard';

const matchesAllowedMimeTypes = (file: FileWithUrls | undefined, allowedMimeTypes?: string[]) => {
  if (!file) return false;
  if (!allowedMimeTypes || allowedMimeTypes.length === 0) return true;
  return allowedMimeTypes.some(filter => {
    if (filter.endsWith('/*')) {
      const baseType = filter.slice(0, -2);
      return file.mimeType.startsWith(`${baseType}/`);
    }
    return file.mimeType === filter;
  });
};

const filterFilesForPicker = (files: FileWithUrls[] = [], allowedMimeTypes?: string[], mode?: 'manager' | 'picker') => {
  if (mode !== 'picker') return files;
  return files.filter(file => matchesAllowedMimeTypes(file, allowedMimeTypes));
};

export default function FileManager({ 
  config, 
  onFileSelect, 
  onFolderSelect, 
  onUpload,
  className,
  mode = 'manager',
  allowedMimeTypes,
  selectionLimit
}: FileManagerProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const { showWarning, showSuccess } = useErrorHandler();
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
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareFileId, setShareFileId] = useState<string | null>(null);
  const [shareFolderId, setShareFolderId] = useState<string | null>(null);
  const [shareType, setShareType] = useState<'file' | 'folder' | null>(null);
  const [recentMenuId, setRecentMenuId] = useState<string | null>(null);
  const [sharedExpanded, setSharedExpanded] = useState(false);
  const [sortKey, setSortKey] = useState<'name' | 'date' | 'size'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [previewFile, setPreviewFile] = useState<FileWithUrls | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileWithUrls | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState('all-files');
  const [sharedFiles, setSharedFiles] = useState<FileWithUrls[]>([]);
  const [sharedFolders, setSharedFolders] = useState<FolderWithFiles[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTargetFile, setRenameTargetFile] = useState<FileWithUrls | null>(null);

  // Helper function to find a folder by ID in the tree structure
  const findFolderById = (folders: FolderWithFiles[] =[], folderId: string): FolderWithFiles | null => {
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
  // Public link removed; 'Public' is now part of the tree and appears first.
  const [rootFiles, setRootFiles] = useState<FileWithUrls[]>([]);
  
  // Get current folder files and folders from Redux state or shared folders
  const currentFolderData = currentFolder 
    ? (findFolderById(folders, currentFolder) || findFolderById(sharedFolders, currentFolder))
    : null;
  const currentFolderFiles = filterFilesForPicker(currentFolderData?.files || [], allowedMimeTypes, mode);
  const currentFolderSubfolders = currentFolderData?.subfolders || [];
  
  // Get all files for recent section (from all folders)
  const allFiles = filterFilesForPicker(folders.flatMap(folder => folder.files), allowedMimeTypes, mode);
  
  // Sort files by updatedAt for recent section
  const recentFiles = allFiles
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  
  // Combine files and folders for display based on current folder and view
  const allItems = activeView === 'shared' ? [
    // Shared folders first
    ...sharedFolders.map(folder => ({
      id: folder.id,
      name: folder.name,
      type: 'folder',
      lastModified: new Date(folder.updatedAt).toLocaleDateString(),
      size: `${(folder?.files?.length || 0)} files`,
      icon: Folder,
      data: folder,
      isFolder: true,
      isShared: true,
    })),
    // Then shared files
    ...filterFilesForPicker(sharedFiles, allowedMimeTypes, mode).map(file => ({
      id: file.id,
      name: file.originalName,
      type: file.mimeType.split('/')[0],
      lastModified: new Date(file.updatedAt).toLocaleDateString(),
      size: formatFileSize(file.fileSize),
      icon: file.mimeType.split('/')[0],
      isFolder: false,
      data: file
    }))
  ] : currentFolder ? [
    ...currentFolderSubfolders.map(folder => ({
      id: folder.id,
      name: folder.name,
      type: 'folder',
      lastModified: new Date(folder.updatedAt).toLocaleDateString(),
      size: `${(folder?.files?.length || 0)} files`,
      icon: Folder,
      data: folder,
      isFolder: true,
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
    // Show root folders and only files at root when no current folder is selected
    ...rootFolders.map(folder => ({
      id: folder.id,
      name: folder.name,
      type: 'folder',
      lastModified: new Date(folder.updatedAt).toLocaleDateString(),
      size: `${(folder?.files?.length || 0)} files`,
      icon: Folder,
      data: folder,
      isFolder: true,
    })),
    ...filterFilesForPicker(rootFiles, allowedMimeTypes, mode).map(file => ({
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

  // Sort currently displayed items
  const itemsSorted = (() => {
    const arr = [...allItems];
    const toTs = (val: any) => {
      if (!val) return 0;
      const d = new Date(val);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };
    const getSize = (item: any) => {
      if (item.isFolder) {
        const f = item.data as any;
        return Array.isArray(f.files) ? f.files.length : 0;
      }
      const f = item.data as any;
      return typeof f.fileSize === 'number' ? f.fileSize : 0;
    };
    const getDate = (item: any) => {
      const d = (item.data as any)?.updatedAt || (item.data as any)?.createdAt;
      return toTs(d);
    };
    arr.sort((a: any, b: any) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === 'date') {
        cmp = getDate(a) - getDate(b);
      } else if (sortKey === 'size') {
        cmp = getSize(a) - getSize(b);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  })();

  useEffect(() => {
    // Load root folders and files on startup
    dispatch(fetchFolderTree(null));
  }, [dispatch]);

  // Track when initial load completes
  useEffect(() => {
    if (folders.length > 0 && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [folders.length, isInitialLoad]);

  // Load shared files and folders when switching to Shared view
  useEffect(() => {
    const loadShared = async () => {
      try {
        // Load shared files
        const filesRes = await apiClient.getSharedFiles();
        if (filesRes.success && filesRes.data?.files) {
          setSharedFiles(filesRes.data.files as FileWithUrls[]);
        } else {
          setSharedFiles([]);
        }

        // Load shared folders
        const foldersRes = await apiClient.getSharedFolders();
        if (foldersRes.success && foldersRes.data?.folders) {
          // Convert FolderEntity[] to FolderWithFiles[] format
          const foldersWithFiles: FolderWithFiles[] = foldersRes.data.folders.map((folder: any) => ({
            ...folder,
            files: [],
            subfolders: []
          }));
          setSharedFolders(foldersWithFiles);
        } else {
          setSharedFolders([]);
        }
      } catch (e) {
        console.error('Failed to load shared items', e);
        setSharedFiles([]);
        setSharedFolders([]);
      }
    };
    if (activeView === 'shared' || sharedExpanded) {
      loadShared();
    }
  }, [activeView, sharedExpanded]);

  // Fetch root files (files without a folder) when at root
  useEffect(() => {
    const fetchRootFiles = async () => {
      try {
        if (currentFolder === null) {
          const res = await apiClient.getFiles();
          if (res.success && res.data?.files) {
            setRootFiles(res.data.files as FileWithUrls[]);
          } else {
            setRootFiles([]);
          }
        }
      } catch {
        setRootFiles([]);
      }
    };
    fetchRootFiles();
  }, [currentFolder]);

  // Remove the useEffect that was causing the issue
  // We don't need to fetch data when clicking folders since we already have the tree

  // Auto-expand folders that have subfolders when data loads
  useEffect(() => {
    const foldersWithSubfolders = new Set<string>();
    const collectFoldersWithSubfolders = (folders: FolderWithFiles[]) => {
      folders.forEach(folder => {
        if (folder?.subfolders && folder?.subfolders?.length > 0) {
          foldersWithSubfolders.add(folder.id);
          collectFoldersWithSubfolders(folder.subfolders);
        }
      });
    };
    collectFoldersWithSubfolders(folders);
    
    // Only expand if we have folders with subfolders and no folders are currently expanded
    if (foldersWithSubfolders.size > 0 && expandedFolders.size === 0) {
      setExpandedFolders(foldersWithSubfolders);
    }
  }, [folders, expandedFolders.size]);

  const { handleUploadComplete } = useFileUpload({
    currentFolder,
    silentRefresh: true,
    onUploadComplete: async (uploadedFiles) => {
      // Also refresh root files if we're at root
      if (currentFolder === null) {
        const rootFilesRes = await apiClient.getFiles(undefined);
        if (rootFilesRes.success && rootFilesRes.data?.files) {
          setRootFiles(rootFilesRes.data.files as FileWithUrls[]);
        }
      }
    },
  });

  const handleFileUpload = async (files: File[], folderId?: string) => {
    // Modal handles all upload logic, we just need to refresh after uploads complete
    await handleUploadComplete(files);
  };

  const handleFolderCreate = async (name: string, parentId?: string) => {
    try {
      await dispatch(createFolder({ name, parentId })).unwrap();
      // Silently refresh the folder tree to show the new folder (without loader)
      try {
        const res = await apiClient.getFolderTree(undefined);
        if (res.success && res.data?.folders) {
          // Directly update the folders in Redux without triggering loading state
          dispatch(setFoldersSilently(res.data.folders as FolderWithFiles[]));
        }
        // Also refresh root files if we're at root level
        if (currentFolder === null) {
          const filesRes = await apiClient.getFiles(undefined);
          if (filesRes.success && filesRes.data?.files) {
            setRootFiles(filesRes.data.files as FileWithUrls[]);
          }
        }
      } catch (refreshError) {
        // If silent refresh fails, fallback to regular refresh
        console.error('Silent refresh failed, falling back to regular refresh:', refreshError);
      dispatch(fetchFolderTree(null));
      }
    } catch (error) {
      console.error('Folder creation failed:', error);
      throw error;
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
    // If clicking a folder from shared view, switch back to all-files view
    if (activeView === 'shared') {
      setActiveView('all-files');
    }
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
    console.log('FileManager - File clicked:', file);
    console.log('FileManager - File ID:', file?.id);
    console.log('FileManager - File originalName:', file?.originalName);
    console.log('FileManager - File downloadUrl:', file?.downloadUrl);
    console.log('FileManager - File mimeType:', file?.mimeType);
    console.log('FileManager - File structure:', {
      id: file?.id,
      filename: file?.filename,
      originalName: file?.originalName,
      mimeType: file?.mimeType,
      filePath: file?.filePath,
      downloadUrl: file?.downloadUrl,
    });
    console.log('FileManager - Mode:', mode);
    console.log('FileManager - onFileSelect exists:', !!onFileSelect);
    
    // Validate file object
    if (!file || !file.id) {
      console.error('FileManager - Invalid file object in handleFileClick:', file);
      return;
    }
    
    // In picker mode, clicking a file selects it and calls onFileSelect
    if (mode === 'picker') {
      console.log('FileManager - Picker mode, calling onFileSelect with file:', file);
      onFileSelect?.(file);
      return;
    }
    
    // In manager mode, open preview modal
    setSelectedFile(file);
    setPreviewFile(file);
    setIsPreviewModalOpen(true);
    onFileSelect?.(file);
  };

  const selectSingle = (id: string) => {
    setSelectedFileIds(new Set([id]));
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
        return next;
      }

      if (selectionLimit === 1) {
        return new Set([fileId]);
      }

      if (!selectionLimit || next.size < selectionLimit) {
        next.add(fileId);
      }

      return next;
    });
  };

  const handleConfirmDelete = async () => {
    if (selectedFileIds.size === 0) return;
    
    // Split selection into files and folders
    const allItemsMap = new Map(allItems.map(item => [item.id, item]));
    const selectedFiles = Array.from(selectedFileIds).filter(id => {
      const item = allItemsMap.get(id);
      return item && !item.isFolder;
    });
    const selectedFolders = Array.from(selectedFileIds).filter(id => {
      const item = allItemsMap.get(id);
      return item && item.isFolder;
    });
    
    try {
      let failures: any[] = [];
      let successesCount = 0;

      if (selectedFiles.length > 0) {
        const deleteFilePromises = selectedFiles.map(fileId => dispatch(deleteFile(fileId)));
        const results = await Promise.allSettled(deleteFilePromises);
        const _fail = results.filter(r => r.status === 'rejected');
        const _succ = results.filter(r => r.status === 'fulfilled');
        failures = failures.concat(_fail);
        successesCount += _succ.length;
      }

      if (selectedFolders.length > 0) {
        // Attempt to delete folders (backend only allows empty)
        const deleteFolderPromises = selectedFolders.map(folderId => dispatch(deleteFolder(folderId)));
        const results = await Promise.allSettled(deleteFolderPromises);
        const _fail = results.filter(r => r.status === 'rejected');
        const _succ = results.filter(r => r.status === 'fulfilled');
        failures = failures.concat(_fail);
        successesCount += _succ.length;
      }
      
      if (failures.length > 0) {
        showWarning(`${failures.length} ${t('errors.itemsFailedToDelete')}`);
      }
      
      setSelectedFileIds(new Set());
      // Always fetch from root to get the complete tree
      await dispatch(fetchFolderTree(null));
      // Close modal after successful refresh
      setIsDeleteModalOpen(false);
    } catch (error) {
      showWarning(t('errors.failedToDeleteItems'));
    }
  };

  const handleMoveSelected = () => {
    if (selectedFileIds.size === 0) return;
    setIsMoveModalOpen(true);
  };

  const openRenameModal = (file: FileWithUrls) => {
    setRenameTargetFile(file);
    setIsRenameModalOpen(true);
  };

  const closeRenameModal = () => {
    if (isRenameModalOpen) {
      setIsRenameModalOpen(false);
      setRenameTargetFile(null);
    }
  };

  const handleRenameFile = async (newName: string) => {
    if (!renameTargetFile) return;
    try {
      const response = await apiClient.renameFile(renameTargetFile.id, newName);
      if (!response.success) {
        throw new Error(response.error?.message || t('errors.failedToRenameFile'));
      }
      showSuccess(t('fileManager.fileRenamed') || 'File renamed successfully');
      closeRenameModal();
      await dispatch(fetchFolderTree(null));

      if (currentFolder === null) {
        try {
          const res = await apiClient.getFiles(undefined);
          if (res.success && res.data?.files) {
            setRootFiles(res.data.files as FileWithUrls[]);
          }
        } catch {}
      }

      if (activeView === 'shared') {
        try {
          const filesRes = await apiClient.getSharedFiles();
          if (filesRes.success && filesRes.data?.files) {
            setSharedFiles(filesRes.data.files as FileWithUrls[]);
          }
          const foldersRes = await apiClient.getSharedFolders();
          if (foldersRes.success && foldersRes.data?.folders) {
            const foldersWithFiles: FolderWithFiles[] = foldersRes.data.folders.map((folder: any) => ({
              ...folder,
              files: [],
              subfolders: []
            }));
            setSharedFolders(foldersWithFiles);
          }
        } catch {}
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.failedToRenameFile');
      showWarning(message);
      throw error;
    }
  };

  // Handle share button click - share first selected file or folder
  const handleShareSelected = () => {
    const selectedIds = Array.from(selectedFileIds);
    if (selectedIds.length === 0) return;
    
    // Check what's selected
    const allItemsMap = new Map(allItems.map(item => [item.id, item]));
    const selectedFiles = selectedIds.filter(id => {
      const item = allItemsMap.get(id);
      return item && !item.isFolder;
    });
    const selectedFolders = selectedIds.filter(id => {
      const item = allItemsMap.get(id);
      return item && item.isFolder;
    });
    
    if (selectedFiles.length > 0 && selectedFolders.length > 0) {
      showWarning(t('errors.selectFilesOrFoldersOnly'));
      return;
    }

    if (selectedFiles.length >= 1) {
      setShareFileId(selectedFiles[0]);
      setShareFolderId(null);
      setShareType('file');
      setIsShareModalOpen(true);
    } else if (selectedFolders.length === 1) {
      setShareFolderId(selectedFolders[0]);
      setShareFileId(null);
      setShareType('folder');
      setIsShareModalOpen(true);
    } else {
      showWarning(t('errors.selectFileOrFolderToShare'));
    }
  };

  // Handle share submission
  const handleShare = async (userIds: string[], accessLevel: 'read' | 'write') => {
    try {
      if (shareType === 'file') {
        // Share all selected files
        const allItemsMap = new Map(allItems.map(item => [item.id, item]));
        const filesToShare = Array.from(selectedFileIds).filter(id => {
          const it = allItemsMap.get(id);
          return it && !it.isFolder;
        });

        const { apiClient } = await import('@/utils/apiClient');
        const results = await Promise.allSettled(
          filesToShare.map(fid => apiClient.shareFileWithUsers(fid, userIds, accessLevel))
        );

        const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));
        if (failures.length > 0) {
          showWarning(`${failures.length} ${t('errors.someFilesFailedToShare')}`);
        } else {
          showSuccess(t('errors.filesSharedSuccessfully'));
        }

        await dispatch(fetchFolderTree(null));
      } else if (shareType === 'folder' && shareFolderId) {
        const res = await (await import('@/utils/apiClient')).apiClient.shareFolderWithUsers(shareFolderId, userIds, accessLevel);
        if (res.success) {
          // Refresh folder tree
          await dispatch(fetchFolderTree(null));
          // Clear selection for shared folder
          setSelectedFileIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(shareFolderId);
            return newSet;
          });
        } else {
          throw new Error(res.error?.message || 'Share failed');
        }
      }
    } catch (error) {
      console.error('Share failed:', error);
      throw error;
    }
  };

  const hasSelectedFiles = selectedFileIds.size > 0;

  const getFileIcon = (item: any) => {
    const iconSize = 14; // compact rows
    // Folder
    if (item.isFolder || item.icon === 'folder') {
      return <Folder size={iconSize} className="text-au-green" />;
    }

    // Determine mime/type
    const mime: string | undefined = (item.data && item.data.mimeType) || undefined;
    const top = (item.icon || (mime ? mime.split('/')[0] : '') || '').toLowerCase();
    const m = (mime || '').toLowerCase();

    // Archives
    if (m.includes('zip') || m.includes('rar') || m.includes('7z') || m.includes('tar') || m.includes('gz')) {
      return <FileArchive size={iconSize} className="text-au-gold" />;
    }

    // Explicit categories
    if (top === 'image') return <FileImage size={iconSize} className="text-au-green" />;
    if (top === 'video') return <FileVideo size={iconSize} className="text-au-green" />;
    if (top === 'audio') return <FileAudio size={iconSize} className="text-au-green" />;

    // Documents
    if (m.includes('pdf')) return <FileText size={iconSize} className="text-au-red" />;
    if (m.includes('spreadsheet') || m.includes('excel') || m.includes('sheet')) return <FileSpreadsheet size={iconSize} className="text-au-green" />;
    if (m.includes('word') || m.includes('document') || m.includes('rtf') || m.includes('presentation') || m.includes('powerpoint') || m.includes('text')) {
      return <FileText size={iconSize} className="text-au-green" />;
    }

    // Fallback
    return <File size={iconSize} className="text-au-grey-text" />;
  };

  const renderFolderTree = (folders: FolderWithFiles[], level: number = 0) => {
    return folders.map((folder) => (
      <div key={folder.id}>
        <div
          onClick={() => handleSidebarFolderClick(folder)}
          className={cn(
            'flex items-center py-2 px-3 rounded-lg cursor-pointer transition-colors group',
            level > 0 && 'ml-6',
            currentFolder === folder.id ? 'bg-au-gold/20 text-au-green' : 'hover:bg-au-gold/5'
          )}
        >
          {/* Expand/Collapse Button */}
          {folder?.subfolders && folder?.subfolders?.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpansion(folder.id);
              }}
              className="mr-2 p-0.5 hover:bg-gray-200 rounded transition-colors"
            >
              {expandedFolders.has(folder.id) ? (
                <ChevronDown size={14} className="text-au-green" />
              ) : (
                <ChevronRight size={14} className="text-au-green" />
              )}
            </button>
          ) : (
            <div className="w-5 mr-2" />
          )}
          
          {/* Folder Icon */}
          <div className="mr-3">
            <Folder size={16} className={currentFolder === folder.id ? "text-au-green" : "text-au-green"} />
          </div>
          
          {/* Folder Name */}
          <span className={cn(
            "text-sm font-medium flex-1",
            currentFolder === folder.id ? "text-au-green" : "text-au-grey-text group-hover:text-au-green"
          )}>
            {folder.name}
          </span>
        </div>
        
        {/* Render subfolders if expanded */}
        {expandedFolders.has(folder.id) && folder?.subfolders && folder?.subfolders?.length > 0 && (
          <div className="ml-2">
            {renderFolderTree(folder.subfolders, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  // Only show loader on initial load, not on refresh operations
  if (loading && isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-au-green"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-au-red text-xl mb-4">{t('common.error')}</div>
          <div className="text-au-grey-text">{error || t('errors.errorLoadingFileManager')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full min-h-0 bg-white w-full overflow-hidden', className)}>
      {/* Left Sidebar */}
      <FileManagerNav
        currentFolder={currentFolder}
        activeView={activeView}
        onHomeClick={() => { dispatch(setCurrentFolder(null)); setActiveView('all-files'); }}
        onSharedClick={() => { setActiveView('shared'); dispatch(setCurrentFolder(null)); if (!sharedExpanded) setSharedExpanded(true); }}
        title={t('fileManager.myFiles')}
        myFilesLabel={t('fileManager.myFiles')}
        homeLabel={t('fileManager.home')}
        sharedLabel={t('fileManager.sharedWithMe')}
        sidebarTree={<>{renderFolderTree(rootFolders)}</>}
        sharedTree={<>{renderFolderTree(sharedFolders)}</>}
        sharedExpanded={sharedExpanded}
        onToggleShared={() => setSharedExpanded(prev => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden lg:ml-0">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 bg-gray-50">
          {/* Breadcrumb Navigation */}
          <div className="mb-4">
            <nav className="flex items-center space-x-2 text-sm">
              <button 
                onClick={() => dispatch(setCurrentFolder(null))}
                className="text-au-green hover:text-au-corporate-green font-medium"
              >
                {t('fileManager.homeFolder')}
              </button>
              {currentFolder && (
                <>
                  <span className="text-au-grey-text/40">/</span>
                  <span className="text-au-grey-text">
                    {currentFolderData?.name || 'Current Folder'}
                  </span>
                </>
              )}
            </nav>
          </div>

          {/* Action Buttons and View Options */}
          {mode !== 'picker' && (
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            {/* Action Buttons - Hidden in picker mode */}
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="px-2.5 py-1.5 text-xs bg-au-green text-au-white rounded-lg hover:bg-au-corporate-green transition-colors flex items-center space-x-1.5"
                >
                  <Upload size={14} />
                  <span className="hidden sm:inline">{t('fileManager.upload')}</span>
                </button>
                <button 
                  onClick={() => setIsCreateFolderModalOpen(true)}
                  className="px-2.5 py-1.5 text-xs bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-1.5"
                >
                  <Folder size={14} />
                  <span className="hidden sm:inline">{t('fileManager.createFolder')}</span>
                </button>
                <button 
                  onClick={handleShareSelected}
                  disabled={!hasSelectedFiles}
                  className={cn(
                    "px-2.5 py-1.5 text-xs bg-au-white text-au-grey-text border border-gray-300 rounded-lg transition-colors flex items-center space-x-1.5",
                    hasSelectedFiles 
                      ? "hover:bg-au-green/10 hover:text-au-green hover:border-au-green cursor-pointer" 
                      : "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Share2 size={14} />
                  <span className="hidden sm:inline">{t('fileManager.share')}</span>
                </button>
                <button 
                  onClick={handleMoveSelected}
                  disabled={!hasSelectedFiles}
                  className={cn(
                    "px-2.5 py-1.5 text-xs bg-au-white text-au-grey-text border border-gray-300 rounded-lg transition-colors flex items-center space-x-1.5",
                    hasSelectedFiles 
                      ? "hover:bg-au-gold/5 cursor-pointer" 
                      : "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Move size={14} />
                  <span className="hidden sm:inline">{t('fileManager.move')}</span>
                </button>
                <button 
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={!hasSelectedFiles}
                  className={cn(
                    "px-2.5 py-1.5 text-xs bg-au-white text-au-grey-text border border-gray-300 rounded-lg transition-colors flex items-center space-x-1.5",
                    hasSelectedFiles 
                      ? "hover:bg-au-red/10 hover:text-au-red hover:border-au-red cursor-pointer" 
                      : "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Trash2 size={14} />
                  <span className="hidden sm:inline">{t('fileManager.delete')}</span>
                </button>
              </div>
            {/* View and Sort Options */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <div className="flex items-center gap-2">
                <select
                  className="px-2 md:px-3 py-2 border border-gray-300 rounded-lg text-xs md:text-sm"
                  value={sortKey}
                  onChange={(e) => {
                    const val = e.target.value as 'name' | 'date' | 'size';
                    setSortKey(val);
                  }}
                >
                  <option value="name">Name</option>
                  <option value="date">Date</option>
                  <option value="size">Size</option>
                </select>
                <button
                  onClick={() => setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="px-2 py-2 border border-gray-300 rounded-lg text-xs md:text-sm text-au-grey-text hover:bg-gray-100"
                  aria-label="Toggle sort direction"
                  title={`Sort ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
                >
                  {sortDir === 'asc' ? 'ASC' : 'DESC'}
                </button>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => dispatch(setViewMode('grid'))}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    viewMode === 'grid' ? 'bg-au-green text-white' : 'text-gray-400 hover:text-gray-600'
                  )}
                  aria-label="Grid view"
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => dispatch(setViewMode('list'))}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    viewMode === 'list' ? 'bg-au-green text-white' : 'text-gray-400 hover:text-gray-600'
                  )}
                  aria-label="List view"
                >
                  <List size={16} />
                </button>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors hidden md:block">
                <HelpCircle size={16} className="text-gray-400" />
              </button>
            </div>
          </div>
          )}

          {/* Recent Files Section */}
          {mode !== 'picker' && recentFiles.length > 0 && (
          <div className="mb-6 md:mb-8">
            <h2 className="text-base md:text-lg font-semibold text-au-grey-text mb-3 md:mb-4">Recent Files</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
              {recentFiles.map((file) => (
                <div
                  key={file?.id || Math.random().toString()}
                  className="relative bg-white rounded-lg border border-gray-200 p-2 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleFileClick(file)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      {getFileIcon({
                        icon: file?.mimeType?.split('/')?.[0] || '',
                        type: file?.mimeType?.split('/')?.[0] || ''
                      })}
                    </div>
                    <button
                      className="p-0.5 hover:bg-gray-100 rounded"
                      onClick={(e) => { e.stopPropagation(); setRecentMenuId(recentMenuId === file.id ? null : file.id); }}
                      aria-label="More actions"
                    >
                      <MoreVertical size={12} className="text-gray-400" />
                    </button>
                  </div>
                  <h3 className="text-xs font-medium text-gray-900 truncate mb-0.5">{file?.originalName || ''}</h3>
                  <p className="text-[10px] text-gray-500">{file?.mimeType?.split('/')?.[0]?.toUpperCase() || ''}, {formatFileSize(file?.fileSize ?? 0)}</p>

                  {file && recentMenuId === file.id && (
                    <div className="absolute right-2 top-8 z-10 w-32 bg-white border border-gray-200 rounded-md shadow-lg py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                        onClick={() => {
                          setRecentMenuId(null);
                          // Share single file
                          setShareFileId(file.id);
                          setShareFolderId(null);
                          setShareType('file');
                          setIsShareModalOpen(true);
                        }}
                      >
                        Share
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                        onClick={() => {
                          setRecentMenuId(null);
                          openRenameModal(file as FileWithUrls);
                        }}
                      >
                        {t('common.rename')}
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                        onClick={() => {
                          setRecentMenuId(null);
                          selectSingle(file.id);
                          setIsMoveModalOpen(true);
                        }}
                      >
                        Move
                      </button>
                      <button
                        className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 text-red-600"
                        onClick={async () => {
                          setRecentMenuId(null);
                          selectSingle(file.id);
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          )}

          {/* All Files Section */}
          <div>
            <h2 className="text-lg font-semibold text-au-grey-text mb-4">
              {(() => {
                // Build breadcrumb text: Home[/Shared with Me][/{folder}/{subfolder}]
                const segments: string[] = ['Home'];
                if (activeView === 'shared' && !currentFolder) {
                  segments.push(t('fileManager.sharedWithMe'));
                  return segments.join(' / ');
                }
                if (currentFolderData) {
                  const pathNames: string[] = [];
                  let cursor: any = currentFolderData;
                  // Walk up via parentId using available trees (owned + shared)
                  while (cursor) {
                    pathNames.unshift(cursor.name);
                    if (!cursor.parentId) break;
                    cursor = findFolderById(folders, cursor.parentId) || findFolderById(sharedFolders, cursor.parentId);
                    if (!cursor) break;
                  }
                  return `${segments.join(' / ')} / ${pathNames.join(' / ')}`;
                }
                return segments.join(' / ');
              })()}
            </h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Empty state - show when no files or folders */}
              {((currentFolder && currentFolderFiles.length === 0 && currentFolderSubfolders.length === 0) ||
                (!currentFolder && rootFolders.length === 0 && rootFiles.length === 0)) ? (
                <EmptyState 
                  type={currentFolder ? 'folder' : 'root'}
                  icon={currentFolder ? 'folder' : 'folderPlus'}
                />
              ) : (
              <>
              {viewMode === 'list' ? (
                <>
              {/* Table Header */}
                  <div className="bg-gray-50 px-3 md:px-6 py-2 border-b border-gray-200">
                    <div className="grid grid-cols-12 gap-2 md:gap-4 text-xs font-medium text-au-grey-text">
                  <div className="col-span-1"></div>
                  <div className="col-span-5">{t('fileManager.name')}</div>
                  <div className="col-span-2 hidden md:block">{t('fileManager.lastModified')}</div>
                  <div className="col-span-2 hidden sm:block">{t('fileManager.size')}</div>
                  <div className="col-span-2 sm:col-span-1">{t('fileManager.manage')}</div>
                </div>
              </div>

              {/* Table Body - Scrollable */}
              <div className="max-h-96 min-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                <div className="divide-y divide-gray-200">
                  {itemsSorted.map((item) => (
                    <FileListRow
                      key={item.id}
                      item={item as any}
                      selected={selectedFileIds.has(item.id)}
                      onToggleSelect={(id) => {
                        console.log('FileManager - onToggleSelect called for id:', id, 'mode:', mode, 'isFolder:', item.isFolder);
                        if (mode === 'picker' && !item.isFolder) {
                          toggleFileSelection(id);
                          onFileSelect?.(item.data as FileWithUrls);
                        } else {
                          toggleFileSelection(id);
                        }
                      }}
                      onOpen={(it) =>
                        it.isFolder
                          ? handleFolderClick(it.data as FolderWithFiles)
                          : handleFileClick(it.data as FileWithUrls)
                      }
                      onShare={(it) => {
                        if (it.isFolder) {
                          setShareFolderId(it.id);
                          setShareFileId(null);
                          setShareType('folder');
                        } else {
                          setShareFileId(it.id);
                          setShareFolderId(null);
                          setShareType('file');
                        }
                        setIsShareModalOpen(true);
                      }}
                      onMove={(it) => {
                        const single = new Set<string>();
                        single.add(it.id);
                        setSelectedFileIds(single);
                        setIsMoveModalOpen(true);
                      }}
                      onDelete={(it) => {
                        const single = new Set<string>();
                        single.add(it.id);
                        setSelectedFileIds(single);
                        setIsDeleteModalOpen(true);
                      }}
                      onRename={(it) => {
                        if (!it.isFolder) {
                          openRenameModal(it.data as FileWithUrls);
                        }
                      }}
                      icon={getFileIcon(item)}
                      mode={mode}
                    />
                  ))}
                        </div>
                          </div>
                </>
              ) : (
                <div className="p-2 md:p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
                    {itemsSorted.map((item) => (
                      <FileGridCard
                        key={item.id}
                        item={item as any}
                        selected={selectedFileIds.has(item.id)}
                        onToggleSelect={(id) => {
                          console.log('FileManager - onToggleSelect called for id:', id, 'mode:', mode, 'isFolder:', item.isFolder);
                          if (mode === 'picker' && !item.isFolder) {
                            toggleFileSelection(id);
                            onFileSelect?.(item.data as FileWithUrls);
                          } else {
                            toggleFileSelection(id);
                          }
                        }}
                        onOpen={(it) =>
                          it.isFolder
                            ? handleFolderClick(it.data as FolderWithFiles)
                            : handleFileClick(it.data as FileWithUrls)
                        }
                        onShare={(it) => {
                          if (it.isFolder) {
                            setShareFolderId(it.id);
                            setShareFileId(null);
                            setShareType('folder');
                          } else {
                            setShareFileId(it.id);
                            setShareFolderId(null);
                            setShareType('file');
                          }
                          setIsShareModalOpen(true);
                        }}
                        onMove={(it) => {
                          const single = new Set<string>();
                          single.add(it.id);
                          setSelectedFileIds(single);
                          setIsMoveModalOpen(true);
                        }}
                        onDelete={(it) => {
                          const single = new Set<string>();
                          single.add(it.id);
                          setSelectedFileIds(single);
                          setIsDeleteModalOpen(true);
                        }}
                        onRename={(it) => {
                          if (!it.isFolder) {
                            openRenameModal(it.data as FileWithUrls);
                          }
                        }}
                        icon={getFileIcon(item)}
                        mode={mode}
                      />
                    ))}
                </div>
              </div>
              )}
              </>
              )}
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

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onCreate={handleFolderCreate}
        parentId={currentFolder || undefined}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        count={selectedFileIds.size}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setShareFileId(null);
          setShareFolderId(null);
          setShareType(null);
        }}
        onShare={handleShare}
        fileId={shareFileId || undefined}
        folderId={shareFolderId || undefined}
      />

      <MoveModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onConfirm={async (destinationFolderId) => {
          try {
            // Filter to only files (not folders)
            const allItemsMap = new Map(allItems.map(item => [item.id, item]));
            const selectedFiles = Array.from(selectedFileIds).filter(id => {
              const item = allItemsMap.get(id);
              return item && !item.isFolder;
            });
            
            if (selectedFiles.length === 0) {
              showWarning('Please select files (not folders) to move. Folders cannot be moved using this action.');
              setIsMoveModalOpen(false);
              return;
            }
            
            // Use API client directly to move files
            console.log('Moving files:', selectedFiles, 'to folder:', destinationFolderId);
            const { apiClient } = await import('@/utils/apiClient');
            const res = await apiClient.moveFiles(selectedFiles, destinationFolderId);
            console.log('Move response:', res);
            
            if (res.success) {
              const movedCount = res.data?.moved || 0;
              console.log(`Successfully moved ${movedCount} file(s)`);
              
              if (movedCount === 0) {
                showWarning('No files were moved. They may already be in the destination folder.');
              } else {
                showSuccess(`Moved ${movedCount} file(s)`);
              }
              
              setSelectedFileIds(new Set());
              // Always fetch from root to get the complete tree
              await dispatch(fetchFolderTree(null));

              // If at Home, refresh root files list as well
              if (currentFolder === null) {
                try {
                  const res = await apiClient.getFiles(undefined);
                  if (res.success && res.data?.files) {
                    setRootFiles(res.data.files as FileWithUrls[]);
                  }
                } catch {}
              }

              // If viewing Shared, reload shared folders/files
              if (activeView === 'shared') {
                try {
                  const filesRes = await apiClient.getSharedFiles();
                  if (filesRes.success && filesRes.data?.files) {
                    setSharedFiles(filesRes.data.files as FileWithUrls[]);
                  }
                  const foldersRes = await apiClient.getSharedFolders();
                  if (foldersRes.success && foldersRes.data?.folders) {
                    const foldersWithFiles: FolderWithFiles[] = foldersRes.data.folders.map((folder: any) => ({
                      ...folder,
                      files: [],
                      subfolders: []
                    }));
                    setSharedFolders(foldersWithFiles);
                  }
                } catch {}
              }

              // Close modal after successful refresh
              setIsMoveModalOpen(false);
            } else {
              console.error('Move failed:', res.error);
              showWarning(`${t('errors.failedToMoveFiles')}: ${res.error?.message || t('errors.unknownError')}`);
            }
          } catch (e) {
            console.error('Move files failed', e);
            showWarning(`${t('errors.failedToMoveFiles')}: ${e instanceof Error ? e.message : t('errors.unknownError')}`);
          }
        }}
        folders={folders}
      />

      <RenameFileModal
        isOpen={isRenameModalOpen}
        initialValue={renameTargetFile?.originalName || renameTargetFile?.filename || ''}
        onClose={closeRenameModal}
        onSubmit={handleRenameFile}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setPreviewFile(null);
        }}
        file={previewFile}
      />
    </div>
  );
}