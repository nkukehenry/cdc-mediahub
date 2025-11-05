# 🚀 Frontend Integration Guide - Media Hub API

## 📋 **Complete API Reference**

### **Base URL:** `http://localhost:3001`

### **API Standards**
- All responses follow a consistent format with `success`, `data`, and optional `error` fields
- Authentication uses JWT Bearer tokens in the `Authorization` header
- Error responses include `type`, `message`, and `timestamp`
- File uploads use `multipart/form-data`
- All other requests use `application/json`

---

## 🔐 **Authentication**

### **1. Register User**
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "createdAt": "2025-10-29T16:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "roles": [],
    "permissions": []
  }
}
```

### **2. Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "roles": ["author"],
    "permissions": ["posts:create", "posts:read"]
  }
}
```

### **3. Get Current User**
```http
GET /api/auth/me
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["author"],
      "permissions": ["posts:create", "posts:read"]
    }
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": {
    "type": "UNAUTHORIZED",
    "message": "Authentication required. Please provide a valid token.",
    "timestamp": "2025-10-29T16:00:00.000Z"
  }
}
```

---

## 📁 **File Management (With User Ownership)**

### **1. Upload File**
Files are owned by the authenticated user. Only the owner and admins can access private files.

```http
POST /api/files/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [file]
folderId: "optional-folder-id"
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "file": {
      "id": "file-uuid",
      "filename": "stored-filename.pdf",
      "originalName": "document.pdf",
      "fileSize": 1024000,
      "mimeType": "application/pdf",
      "folderId": null,
      "userId": "user-uuid",
      "accessType": "private",
      "downloadUrl": "http://localhost:3001/api/files/file-uuid/download",
      "thumbnailUrl": null,
      "createdAt": "2025-10-29T16:00:00.000Z"
    }
  }
}
```

### **2. Get Files**
Returns only files the user has access to:
- Files owned by the user
- Files with `access_type = 'public'`
- Files explicitly shared with the user

```http
GET /api/files?folderId=folder-id
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "file-uuid",
        "filename": "document.pdf",
        "originalName": "document.pdf",
        "fileSize": 1024000,
        "mimeType": "application/pdf",
        "userId": "user-uuid",
        "accessType": "private",
        "downloadUrl": "http://localhost:3001/api/files/file-uuid/download",
        "thumbnailUrl": null,
        "createdAt": "2025-10-29T16:00:00.000Z"
      }
    ]
  }
}
```

### **3. Download File**
```http
GET /api/files/{fileId}/download
Authorization: Bearer {token}
```

**Response:** Returns file binary or redirects to file URL

### **4. Share File**
```http
POST /api/files/{fileId}/share
Authorization: Bearer {token}
Content-Type: application/json

{
  "sharedWithUserId": "target-user-uuid",
  "accessLevel": "read"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "share": {
      "id": "share-uuid",
      "fileId": "file-uuid",
      "sharedWithUserId": "target-user-uuid",
      "accessLevel": "read",
      "createdAt": "2025-10-29T16:00:00.000Z"
    }
  }
}
```

### **5. Search Files**
```http
GET /api/files/search?q=document
Authorization: Bearer {token}
```

### **6. Delete File**
```http
DELETE /api/files/{fileId}
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

---

## 🗂️ **Folder Management**

### **1. Get Folder Tree**
```http
GET /api/folders/tree?parentId=optional-parent-id
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "folders": [
      {
        "id": "folder-uuid",
        "name": "Documents",
        "parentId": null,
        "userId": "user-uuid",
        "accessType": "private",
        "files": [
          {
            "id": "file-uuid",
            "filename": "document.pdf",
            "downloadUrl": "http://localhost:3001/api/files/file-uuid/download",
            "thumbnailUrl": null
          }
        ],
            "subfolders": []
      }
    ]
  }
}
```

### **2. Create Folder**
```http
POST /api/folders
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Folder",
  "parentId": "optional-parent-folder-id"
}
```

### **3. List Folders**
```http
GET /api/folders?parentId=optional-parent-id
Authorization: Bearer {token}
```

### **4. Update Folder**
```http
PUT /api/folders/{folderId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Folder Name"
}
```

### **5. Delete Folder**
```http
DELETE /api/folders/{folderId}
Authorization: Bearer {token}
```

---

## 📰 **Posts (Public Endpoints)**

All public endpoints are open (no authentication required), but optional authentication provides user context.

### **1. Get Featured Posts**
```http
GET /api/public/posts/featured?limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "post-uuid",
        "title": "Featured Article",
        "slug": "featured-article",
        "description": "Article description",
        "coverImage": "http://localhost:3001/uploads/cover.jpg",
        "category": {
          "id": "category-uuid",
          "name": "Videos",
          "slug": "videos"
        },
        "creator": {
          "id": "user-uuid",
          "username": "author_name",
          "firstName": "John",
          "lastName": "Doe"
        },
        "status": "approved",
        "publicationDate": "2025-10-29T16:00:00.000Z",
        "views": 150,
        "uniqueHits": 120,
        "isFeatured": true,
        "isLeaderboard": false,
        "subcategories": [],
        "attachments": [],
        "authors": []
      }
    ]
  }
}
```

### **2. Get Leaderboard Posts**
```http
GET /api/public/posts/leaderboard?limit=10
```

### **3. Get Published Posts**
```http
GET /api/public/posts?limit=20&offset=0
```

### **4. Search Posts**
```http
GET /api/public/posts/search?q=health&limit=20
```

### **5. Get Post by Slug**
```http
GET /api/public/posts/{slug}
```

**Note:** This endpoint automatically tracks views and increments counters.

---

## 📝 **Posts (Admin/Author Endpoints)**

### **1. Create Post**
```http
POST /api/admin/posts
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "My New Post",
  "slug": "my-new-post",
  "description": "Post description here",
  "metaTitle": "SEO Meta Title",
  "metaDescription": "SEO meta description",
  "coverImage": "http://localhost:3001/uploads/cover.jpg",
  "categoryId": "550e8400-e29b-41d4-a716-446655440001",
  "subcategoryIds": ["subcategory-uuid-1", "subcategory-uuid-2"],
  "attachmentIds": ["file-uuid-1", "file-uuid-2"],
  "authorIds": ["user-uuid-1"],
  "publicationDate": "2025-11-01T10:00:00.000Z",
  "hasComments": true,
  "isFeatured": false,
  "isLeaderboard": true,
  "status": "pending"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "post": {
      "id": "post-uuid",
      "title": "My New Post",
      "slug": "my-new-post",
      "status": "pending",
      "createdAt": "2025-10-29T16:00:00.000Z"
    }
  }
}
```

### **2. Get Post by ID**
```http
GET /api/admin/posts/{id}
Authorization: Bearer {token}
```

### **3. Update Post**
```http
PUT /api/admin/posts/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated Title",
  "status": "draft"
}
```

### **4. Delete Post**
```http
DELETE /api/admin/posts/{id}
Authorization: Bearer {token}
```

### **5. Approve Post (Admin Only)**
```http
POST /api/admin/posts/{id}/approve
Authorization: Bearer {token}
Content-Type: application/json

{
  "approverId": "admin-user-uuid"
}
```

### **6. Reject Post (Admin Only)**
```http
POST /api/admin/posts/{id}/reject
Authorization: Bearer {token}
Content-Type: application/json

{
  "approverId": "admin-user-uuid"
}
```

---

## 📂 **Categories (Public)**

### **1. Get All Categories**
```http
GET /api/public/categories
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Videos",
        "slug": "videos",
        "description": null,
        "createdAt": "2025-10-29T16:00:00.000Z"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "name": "Audios",
        "slug": "audios",
        "description": null,
        "createdAt": "2025-10-29T16:00:00.000Z"
      }
    ]
  }
}
```

### **2. Get Category by ID**
```http
GET /api/public/categories/{id}
```

---

## 📂 **Categories (Admin)**

### **1. Create Category**
```http
POST /api/admin/categories
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "New Category",
  "slug": "new-category",
  "description": "Category description"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "category-uuid",
      "name": "New Category",
      "slug": "new-category",
      "description": "Category description",
      "createdAt": "2025-10-29T16:00:00.000Z"
    }
  }
}
```

### **2. Update Category**
```http
PUT /api/admin/categories/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Category Name",
  "description": "Updated description"
}
```

### **3. Delete Category**
```http
DELETE /api/admin/categories/{id}
Authorization: Bearer {token}
```

---

## 🔒 **Authentication Standards**

### **JWT Token Usage**
All protected endpoints require a JWT Bearer token:

```typescript
const token = localStorage.getItem('authToken');
const response = await fetch('http://localhost:3001/api/files', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### **Token Storage**
- Store token in `localStorage` or `sessionStorage`
- Include token in `Authorization` header for all authenticated requests
- Handle 401 responses by redirecting to login

### **Role-Based Access Control**
- **Admin**: Full access to all resources
- **Author**: Can create/edit their own posts
- **User**: Can access own files and public files

---

## 📊 **Response Format Standards**

### **Success Response**
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### **Error Response**
```json
{
  "success": false,
  "error": {
    "type": "VALIDATION_ERROR",
    "message": "Validation failed",
    "field": "email",
    "timestamp": "2025-10-29T16:00:00.000Z"
  }
}
```

### **Error Types**
- `VALIDATION_ERROR` - Invalid input data (400)
- `UNAUTHORIZED` - Missing or invalid authentication (401)
- `FORBIDDEN` - Insufficient permissions (403)
- `NOT_FOUND` - Resource not found (404)
- `DATABASE_ERROR` - Database operation failed (500)
- `INTERNAL_ERROR` - Server error (500)

---

## 🎨 **Frontend Implementation Examples**

### **React/Next.js Authentication Hook**

```tsx
// useAuth.ts
import { useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
      const data = await response.json();
        setUser(data.data.user);
      } else {
        localStorage.removeItem('authToken');
        setToken(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (data.success) {
      setToken(data.data.token);
      setUser(data.data.user);
      localStorage.setItem('authToken', data.data.token);
      return { success: true };
    } else {
      return { success: false, error: data.error };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
  };

  return { user, token, loading, login, logout };
}
```

### **API Client with Authentication**

```typescript
// apiClient.ts
const API_BASE_URL = 'http://localhost:3001';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized - redirect to login
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      throw new Error(data.error?.message || 'Request failed');
    }

    return data;
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async getCurrentUser() {
    return this.request('/api/auth/me');
  }

  // Posts
  async getFeaturedPosts(limit = 10) {
    return this.request(`/api/public/posts/featured?limit=${limit}`);
  }

  async getLeaderboardPosts(limit = 10) {
    return this.request(`/api/public/posts/leaderboard?limit=${limit}`);
  }

  async createPost(postData: any) {
    return this.request('/api/admin/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  // Files
  async uploadFile(file: File, folderId?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId);

    const token = this.getToken();
    const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });

    return response.json();
  }

  async getFiles(folderId?: string) {
    const query = folderId ? `?folderId=${folderId}` : '';
    return this.request(`/api/files${query}`);
  }

  // Categories
  async getCategories() {
    return this.request('/api/public/categories');
  }
}

export const apiClient = new ApiClient();
```

### **Redux Toolkit Integration with Auth**

```typescript
// store/authSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '../utils/apiClient';

interface AuthState {
  user: any | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('authToken'),
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await apiClient.login(email, password);
    if (response.success) {
      localStorage.setItem('authToken', response.data.token);
      return response.data;
    }
    throw new Error(response.error?.message || 'Login failed');
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async () => {
    const response = await apiClient.getCurrentUser();
    return response.data.user;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('authToken');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
```

---

## 🎯 **Key Features & Best Practices**

### **✅ File Ownership & Access**
- Users only see their own files, public files, and files shared with them
- Use `accessType` field to determine file visibility
- Implement "Shared with me" view by filtering files with `accessType: 'shared'`

### **✅ Post Management**
- Public endpoints work without authentication
- Use featured/leaderboard endpoints for homepage sliders
- Track views automatically when fetching posts by slug
- Approval workflow: `pending` → `approved`/`rejected`

### **✅ Category Structure**
- Main categories: Videos, Audios, Photos, Infographics, Documents, Other
- Subcategories can belong to multiple main categories
- Posts belong to one main category but can have multiple subcategories

### **✅ Error Handling Pattern**
```typescript
try {
  const response = await apiClient.getFeaturedPosts();
  if (response.success) {
    // Handle success
  }
} catch (error) {
  if (error.message.includes('401')) {
    // Redirect to login
  } else if (error.message.includes('403')) {
    // Show permission denied
  } else {
    // Show generic error
  }
}
```

### **✅ Loading States**
```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  try {
    setLoading(true);
    const response = await apiClient.getFeaturedPosts();
    // Handle response
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 🔗 **API Documentation**

Visit `http://localhost:3001/api-docs` for interactive Swagger documentation with:
- All endpoint details
- Request/response schemas
- Try-it-out functionality
- Authentication testing

---

## 📱 **Mobile & Responsive Considerations**

- Use thumbnail URLs for image optimization
- Implement pagination for posts lists
- Support touch gestures for file/folder selection
- Cache authentication tokens securely
- Handle network errors gracefully

---

The backend is fully ready to support a beautiful, modern media hub frontend! 🚀
