import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { FileManagerState, FileWithUrls, FolderWithFiles } from '@/types/fileManager';
import { apiClient } from '@/utils/apiClient';

// Default configuration
const defaultConfig = {
  apiBaseUrl: 'http://localhost:3001',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['*'],
  enableDragDrop: true,
  enableThumbnails: true,
  enableSearch: true,
  enableFolderCreation: true,
  enableFileDeletion: true,
  enableFileUpload: true,
};

// Async thunks - using apiClient for authenticated requests
export const fetchFolderTree = createAsyncThunk(
  'fileManager/fetchFolderTree',
  async (parentId: string | null = null) => {
    const response = await apiClient.getFolderTree(parentId || undefined);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch folder tree');
    }
    return response.data.folders as FolderWithFiles[];
  }
);

export const uploadFile = createAsyncThunk(
  'fileManager/uploadFile',
  async ({ file, folderId }: { file: File; folderId?: string }) => {
    const response = await apiClient.uploadFile(file, folderId);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Upload failed');
    }
    return response.data.file as FileWithUrls;
  }
);

export const createFolder = createAsyncThunk(
  'fileManager/createFolder',
  async ({ name, parentId }: { name: string; parentId?: string }) => {
    const response = await apiClient.createFolder(name, parentId);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Create folder failed');
    }
    return response.data.folder;
  }
);

export const deleteFile = createAsyncThunk(
  'fileManager/deleteFile',
  async (fileId: string) => {
    const response = await apiClient.deleteFile(fileId);
    if (!response.success) {
      throw new Error(response.error?.message || 'Delete file failed');
    }
    return fileId;
  }
);

export const deleteFolder = createAsyncThunk(
  'fileManager/deleteFolder',
  async (folderId: string) => {
    const response = await apiClient.deleteFolder(folderId);
    if (!response.success) {
      throw new Error(response.error?.message || 'Delete folder failed');
    }
    return folderId;
  }
);

export const searchFiles = createAsyncThunk(
  'fileManager/searchFiles',
  async (query: string) => {
    const response = await apiClient.searchFiles(query);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Search failed');
    }
    return response.data.files as FileWithUrls[];
  }
);

export const moveFiles = createAsyncThunk(
  'fileManager/moveFiles',
  async ({ fileIds, destinationFolderId }: { fileIds: string[]; destinationFolderId: string | null }) => {
    const response = await apiClient.moveFiles(fileIds, destinationFolderId);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Move files failed');
    }
    return response.data.moved as number;
  }
);

// Initial state
const initialState: FileManagerState = {
  folders: [],
  currentFolder: null,
  currentPath: [],
  viewMode: 'list',
  loading: false,
  error: null,
  selectedFiles: [],
  searchQuery: '',
  uploadProgress: {},
};

// Slice
const fileManagerSlice = createSlice({
  name: 'fileManager',
  initialState,
  reducers: {
    setCurrentFolder: (state, action: PayloadAction<string | null>) => {
      state.currentFolder = action.payload;
    },
    setCurrentPath: (state, action: PayloadAction<string[]>) => {
      state.currentPath = action.payload;
    },
    setViewMode: (state, action: PayloadAction<'grid' | 'list'>) => {
      state.viewMode = action.payload;
    },
    setSelectedFiles: (state, action: PayloadAction<string[]>) => {
      state.selectedFiles = action.payload;
    },
    toggleFileSelection: (state, action: PayloadAction<string>) => {
      const fileId = action.payload;
      const index = state.selectedFiles.indexOf(fileId);
      if (index > -1) {
        state.selectedFiles.splice(index, 1);
      } else {
        state.selectedFiles.push(fileId);
      }
    },
    clearSelection: (state) => {
      state.selectedFiles = [];
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setUploadProgress: (state, action: PayloadAction<{ fileId: string; progress: number }>) => {
      state.uploadProgress[action.payload.fileId] = action.payload.progress;
    },
    clearUploadProgress: (state, action: PayloadAction<string>) => {
      delete state.uploadProgress[action.payload];
    },
    clearError: (state) => {
      state.error = null;
    },
    setFoldersSilently: (state, action: PayloadAction<FolderWithFiles[]>) => {
      state.folders = action.payload;
      // Don't set loading or error - this is a silent update
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch folder tree
      .addCase(fetchFolderTree.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFolderTree.fulfilled, (state, action) => {
        state.loading = false;
        // Always store the complete tree structure
        state.folders = action.payload;
      })
      .addCase(fetchFolderTree.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch folders';
      })
      // Upload file
      .addCase(uploadFile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadFile.fulfilled, (state, action) => {
        state.loading = false;
        // Refresh folder tree after upload
        // This will be handled by the component
      })
      .addCase(uploadFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Upload failed';
      })
      // Create folder
      .addCase(createFolder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFolder.fulfilled, (state, action) => {
        state.loading = false;
        // Refresh folder tree after creation
      })
      .addCase(createFolder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Create folder failed';
      })
      // Delete file
      .addCase(deleteFile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFile.fulfilled, (state, action) => {
        state.loading = false;
        // Remove from selected files if it was selected
        state.selectedFiles = state.selectedFiles.filter(id => id !== action.payload);
      })
      .addCase(deleteFile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Delete file failed';
      })
      // Delete folder
      .addCase(deleteFolder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteFolder.fulfilled, (state, action) => {
        state.loading = false;
      })
      .addCase(deleteFolder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Delete folder failed';
      })
      // Search files
      .addCase(searchFiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchFiles.fulfilled, (state, action) => {
        state.loading = false;
        // Store search results in a separate state if needed
      })
      .addCase(searchFiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Search failed';
      })
      // Move files
      .addCase(moveFiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(moveFiles.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(moveFiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Move files failed';
      });
  },
});

export const {
  setCurrentFolder,
  setCurrentPath,
  setViewMode,
  setSelectedFiles,
  setFoldersSilently,
  toggleFileSelection,
  clearSelection,
  setSearchQuery,
  setUploadProgress,
  clearUploadProgress,
  clearError,
} = fileManagerSlice.actions;

export default fileManagerSlice.reducer;
