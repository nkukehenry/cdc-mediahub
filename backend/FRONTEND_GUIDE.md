# 🚀 Frontend Integration Guide

## 📋 **Complete API Reference**

### **Base URL:** `http://localhost:3001`

---

## 🗂️ **Folder Management**

### **1. Get Folder Tree (Recommended for File Manager UI)**
```http
GET /api/folders/tree
```

**Response includes:**
- ✅ Nested folder structure
- ✅ Files within each folder
- ✅ Full download URLs
- ✅ Thumbnail URLs
- ✅ Recursive subfolders

**Example Response:**
```json
{
  "success": true,
  "data": {
    "folders": [
      {
        "id": "folder-id",
        "name": "Documents",
        "parentId": null,
        "files": [
          {
            "id": "file-id",
            "filename": "stored-filename.pdf",
            "originalName": "document.pdf",
            "fileSize": 1024,
            "mimeType": "application/pdf",
            "downloadUrl": "http://localhost:3001/api/files/file-id/download",
            "thumbnailUrl": "http://localhost:3001/thumbnails/thumb-file-id.png",
            "createdAt": "2025-10-28T18:00:00.000Z"
          }
        ],
        "subfolders": [
          {
            "id": "subfolder-id",
            "name": "Subfolder",
            "files": [],
            "subfolders": []
          }
        ]
      }
    ]
  }
}
```

### **2. Get Simple Folder List**
```http
GET /api/folders?parentId=folder-id
```

### **3. Create Folder**
```http
POST /api/folders
Content-Type: application/json

{
  "name": "New Folder",
  "parentId": "optional-parent-folder-id"
}
```

### **4. Update Folder**
```http
PUT /api/folders/{folderId}
Content-Type: application/json

{
  "name": "Updated Folder Name"
}
```

### **5. Delete Folder**
```http
DELETE /api/folders/{folderId}
```

---

## 📁 **File Management**

### **1. Upload File**
```http
POST /api/files/upload
Content-Type: multipart/form-data

file: [file]
folderId: "optional-folder-id"
```

**Response includes:**
- ✅ Full file metadata
- ✅ Download URL
- ✅ Thumbnail URL

### **2. Get Files in Folder**
```http
GET /api/files?folderId=folder-id
```

**Response includes:**
- ✅ All files with download URLs
- ✅ Thumbnail URLs
- ✅ File metadata

### **3. Download File**
```http
GET /api/files/{fileId}/download
```

### **4. Search Files**
```http
GET /api/files/search?q=search-term
```

### **5. Delete File**
```http
DELETE /api/files/{fileId}
```

---

## 🎨 **Frontend Implementation Examples**

### **React/Next.js File Manager Component**

```tsx
// FileManager.tsx
import { useState, useEffect } from 'react';

interface FileWithUrls {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

interface FolderWithFiles {
  id: string;
  name: string;
  parentId: string | null;
  files: FileWithUrls[];
  subfolders: FolderWithFiles[];
}

export default function FileManager() {
  const [folders, setFolders] = useState<FolderWithFiles[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFolderTree();
  }, []);

  const fetchFolderTree = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/folders/tree');
      const data = await response.json();
      setFolders(data.data.folders);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, folderId?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId);

    try {
      const response = await fetch('http://localhost:3001/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (data.success) {
        // Refresh the folder tree
        fetchFolderTree();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const createFolder = async (name: string, parentId?: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId }),
      });
      
      if (response.ok) {
        fetchFolderTree();
      }
    } catch (error) {
      console.error('Create folder failed:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="file-manager">
      <FolderTree 
        folders={folders} 
        onUpload={uploadFile}
        onCreateFolder={createFolder}
      />
    </div>
  );
}
```

### **Folder Tree Component**

```tsx
// FolderTree.tsx
interface FolderTreeProps {
  folders: FolderWithFiles[];
  onUpload: (file: File, folderId?: string) => void;
  onCreateFolder: (name: string, parentId?: string) => void;
}

export default function FolderTree({ folders, onUpload, onCreateFolder }: FolderTreeProps) {
  return (
    <div className="folder-tree">
      {folders.map(folder => (
        <FolderItem 
          key={folder.id}
          folder={folder}
          onUpload={onUpload}
          onCreateFolder={onCreateFolder}
        />
      ))}
    </div>
  );
}
```

### **File Picker Widget**

```tsx
// FilePicker.tsx
interface FilePickerProps {
  onFileSelect: (file: FileWithUrls) => void;
  folderId?: string;
}

export default function FilePicker({ onFileSelect, folderId }: FilePickerProps) {
  const [files, setFiles] = useState<FileWithUrls[]>([]);

  useEffect(() => {
    fetchFiles();
  }, [folderId]);

  const fetchFiles = async () => {
    const url = folderId 
      ? `http://localhost:3001/api/files?folderId=${folderId}`
      : 'http://localhost:3001/api/files';
      
    const response = await fetch(url);
    const data = await response.json();
    setFiles(data.data.files);
  };

  return (
    <div className="file-picker">
      {files.map(file => (
        <div 
          key={file.id} 
          className="file-item"
          onClick={() => onFileSelect(file)}
        >
          {file.thumbnailUrl ? (
            <img src={file.thumbnailUrl} alt={file.originalName} />
          ) : (
            <div className="file-icon">{getFileIcon(file.mimeType)}</div>
          )}
          <span>{file.originalName}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## 🔧 **Redux Toolkit Integration**

### **File Manager Slice**

```typescript
// fileManagerSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface FileManagerState {
  folders: FolderWithFiles[];
  currentFolder: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: FileManagerState = {
  folders: [],
  currentFolder: null,
  loading: false,
  error: null,
};

export const fetchFolderTree = createAsyncThunk(
  'fileManager/fetchFolderTree',
  async (parentId?: string) => {
    const url = parentId 
      ? `http://localhost:3001/api/folders/tree?parentId=${parentId}`
      : 'http://localhost:3001/api/folders/tree';
      
    const response = await fetch(url);
    const data = await response.json();
    return data.data.folders;
  }
);

export const uploadFile = createAsyncThunk(
  'fileManager/uploadFile',
  async ({ file, folderId }: { file: File; folderId?: string }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId);

    const response = await fetch('http://localhost:3001/api/files/upload', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    return data.data.file;
  }
);

const fileManagerSlice = createSlice({
  name: 'fileManager',
  initialState,
  reducers: {
    setCurrentFolder: (state, action) => {
      state.currentFolder = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFolderTree.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFolderTree.fulfilled, (state, action) => {
        state.loading = false;
        state.folders = action.payload;
      })
      .addCase(fetchFolderTree.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch folders';
      });
  },
});

export const { setCurrentFolder } = fileManagerSlice.actions;
export default fileManagerSlice.reducer;
```

---

## 🎯 **Key Features for Frontend**

### **✅ What's Ready:**

1. **Complete CRUD Operations**
   - Create, read, update, delete folders
   - Upload, download, delete files
   - Search functionality

2. **Full URL Support**
   - `downloadUrl` - Direct file download
   - `thumbnailUrl` - Image thumbnails
   - All URLs are absolute and ready to use

3. **Nested Structure**
   - Hierarchical folder tree
   - Files nested within folders
   - Recursive subfolder support

4. **File Metadata**
   - Original filename
   - File size
   - MIME type
   - Creation date
   - Thumbnail support

5. **Error Handling**
   - Consistent error responses
   - HTTP status codes
   - Detailed error messages

### **🚀 Recommended Frontend Architecture:**

1. **Use `/api/folders/tree`** for main file manager UI
2. **Use `/api/files/upload`** for file uploads
3. **Use `downloadUrl`** for file downloads
4. **Use `thumbnailUrl`** for image previews
5. **Implement drag-and-drop** for file uploads
6. **Add folder creation** UI
7. **Implement search** functionality

### **📱 Mobile Responsive Considerations:**

- Touch-friendly file/folder selection
- Swipe gestures for navigation
- Responsive grid layouts
- Mobile-optimized upload interface

---

## 🔗 **API Documentation**

Visit `http://localhost:3001/api-docs` for interactive Swagger documentation.

---

## 🎨 **UI/UX Recommendations:**

1. **Tree View** - Use nested folder structure
2. **Grid/List Toggle** - Switch between view modes
3. **Drag & Drop** - File upload with visual feedback
4. **Thumbnails** - Show image previews
5. **Progress Indicators** - Upload progress bars
6. **Context Menus** - Right-click actions
7. **Breadcrumbs** - Navigation path
8. **Search Bar** - Global file search

The backend is fully ready to support a beautiful, modern file manager frontend! 🚀
