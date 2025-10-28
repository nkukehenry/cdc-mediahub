import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { FileManagerState, FileWithUrls, FolderWithFiles } from '@/types/fileManager';

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

// Helper functions
const buildApiUrl = (endpoint: string, params?: Record<string, string>) => {
  const baseUrl = defaultConfig.apiBaseUrl;
  const url = new URL(`${baseUrl}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  return url.toString();
};

const handleApiError = (response: Response, operation: string) => {
  if (!response.ok) {
    throw new Error(`${operation} failed: ${response.statusText}`);
  }
};

const createFormData = (file: File, folderId?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);
  return formData;
};

const createJsonBody = (data: Record<string, any>) => {
  return JSON.stringify(data);
};

// Async thunks
export const fetchFolderTree = createAsyncThunk(
  'fileManager/fetchFolderTree',
  async (parentId: string | null = null) => {
    const endpoint = '/api/folders/tree';
    const params = parentId ? { parentId } : undefined;
    const url = buildApiUrl(endpoint, params);
    
    const response = await fetch(url);
    handleApiError(response, 'Fetch folders');
    
    const data = await response.json();
    return data.data.folders;
  }
);

export const uploadFile = createAsyncThunk(
  'fileManager/uploadFile',
  async ({ file, folderId }: { file: File; folderId?: string }) => {
    const endpoint = '/api/files/upload';
    const url = buildApiUrl(endpoint);
    const formData = createFormData(file, folderId);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    
    handleApiError(response, 'Upload');
    
    const data = await response.json();
    return data.data.file;
  }
);

export const createFolder = createAsyncThunk(
  'fileManager/createFolder',
  async ({ name, parentId }: { name: string; parentId?: string }) => {
    const endpoint = '/api/folders';
    const url = buildApiUrl(endpoint);
    const body = createJsonBody({ name, parentId });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    
    handleApiError(response, 'Create folder');
    
    const data = await response.json();
    return data.data.folder;
  }
);

export const deleteFile = createAsyncThunk(
  'fileManager/deleteFile',
  async (fileId: string) => {
    const endpoint = `/api/files/${fileId}`;
    const url = buildApiUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'DELETE',
    });
    
    handleApiError(response, 'Delete file');
    return fileId;
  }
);

export const deleteFolder = createAsyncThunk(
  'fileManager/deleteFolder',
  async (folderId: string) => {
    const endpoint = `/api/folders/${folderId}`;
    const url = buildApiUrl(endpoint);
    
    const response = await fetch(url, {
      method: 'DELETE',
    });
    
    handleApiError(response, 'Delete folder');
    return folderId;
  }
);

export const searchFiles = createAsyncThunk(
  'fileManager/searchFiles',
  async (query: string) => {
    const endpoint = '/api/files/search';
    const params = { q: query };
    const url = buildApiUrl(endpoint, params);
    
    const response = await fetch(url);
    handleApiError(response, 'Search');
    
    const data = await response.json();
    return data.data.files;
  }
);

// Initial state
const initialState: FileManagerState = {
  folders: [],
  currentFolder: null,
  currentPath: [],
  viewMode: 'grid',
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
      });
  },
});

export const {
  setCurrentFolder,
  setCurrentPath,
  setViewMode,
  setSelectedFiles,
  toggleFileSelection,
  clearSelection,
  setSearchQuery,
  setUploadProgress,
  clearUploadProgress,
  clearError,
} = fileManagerSlice.actions;

export default fileManagerSlice.reducer;
