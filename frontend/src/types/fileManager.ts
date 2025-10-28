// Core types for the file manager module
export interface FileWithUrls {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  thumbnailPath?: string;
  fileSize: number;
  mimeType: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
  downloadUrl: string;
  thumbnailUrl: string | null;
}

export interface FolderWithFiles {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  files: FileWithUrls[];
  subfolders: FolderWithFiles[];
}

export interface FileManagerState {
  folders: FolderWithFiles[];
  currentFolder: string | null;
  currentPath: string[];
  viewMode: 'grid' | 'list';
  loading: boolean;
  error: string | null;
  selectedFiles: string[];
  searchQuery: string;
  uploadProgress: { [key: string]: number };
}

export interface FileManagerConfig {
  apiBaseUrl: string;
  maxFileSize: number;
  allowedFileTypes: string[];
  enableDragDrop: boolean;
  enableThumbnails: boolean;
  enableSearch: boolean;
  enableFolderCreation: boolean;
  enableFileDeletion: boolean;
  enableFileUpload: boolean;
}

export interface FileManagerProps {
  config?: Partial<FileManagerConfig>;
  onFileSelect?: (file: FileWithUrls) => void;
  onFolderSelect?: (folder: FolderWithFiles) => void;
  onUpload?: (files: FileWithUrls[]) => void;
  className?: string;
  mode?: 'manager' | 'picker';
}

export interface FilePickerProps {
  onFileSelect: (file: FileWithUrls) => void;
  folderId?: string;
  multiple?: boolean;
  allowedTypes?: string[];
  className?: string;
}

export interface FileItemProps {
  file: FileWithUrls;
  viewMode: 'grid' | 'list';
  selected: boolean;
  onSelect: (fileId: string) => void;
  onDoubleClick?: (file: FileWithUrls) => void;
  className?: string;
}

export interface FolderItemProps {
  folder: FolderWithFiles;
  viewMode: 'grid' | 'list';
  selected: boolean;
  onSelect: (folderId: string) => void;
  onDoubleClick?: (folder: FolderWithFiles) => void;
  className?: string;
}

export interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  folderId?: string;
  disabled?: boolean;
  className?: string;
}

export interface BreadcrumbProps {
  path: string[];
  onNavigate: (index: number) => void;
  className?: string;
}

export interface SearchBarProps {
  query: string;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export interface ViewToggleProps {
  mode: 'grid' | 'list';
  onModeChange: (mode: 'grid' | 'list') => void;
  className?: string;
}
