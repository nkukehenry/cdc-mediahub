/**
 * API Client utility for making authenticated requests
 * Handles JWT tokens and error responses
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    timestamp: string;
    field?: string;
  };
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('authToken', token);
  }

  private removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('authToken');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {};

    // Copy existing headers if they exist
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.assign(headers, options.headers);
      }
    }

    // Add content type for JSON requests
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('[apiClient] No auth token found in localStorage for request:', endpoint);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: new Headers(headers),
      });

      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401) {
          this.removeToken();
          // Redirect to admin login if not already there
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin')) {
            window.location.href = '/admin';
          }
        }

        throw new Error(data.error?.message || `Request failed: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<ApiResponse> {
    const response = await this.request<{ token: string; user: any; roles: string[]; permissions: string[] }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async register(userData: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }): Promise<ApiResponse> {
    const response = await this.request<{ token: string; user: any; roles: string[]; permissions: string[] }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async getCurrentUser(): Promise<ApiResponse> {
    return this.request('/api/auth/me');
  }

  async updateLanguage(language: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>('/api/auth/language', {
      method: 'PUT',
      body: JSON.stringify({ language }),
    });
  }

  logout(): void {
    this.removeToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/admin';
    }
  }

  // File Management methods
  async uploadFile(file: File, folderId?: string): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId);

    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data: ApiResponse = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        this.removeToken();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/admin')) {
          window.location.href = '/admin';
        }
      }
      throw new Error(data.error?.message || 'Upload failed');
    }

    return data;
  }

  async moveFiles(fileIds: string[], destinationFolderId: string | null): Promise<ApiResponse<{ moved: number }>> {
    return this.request<{ moved: number }>(`/api/files/move`, {
      method: 'POST',
      body: JSON.stringify({ fileIds, destinationFolderId }),
    });
  }

  async getFiles(folderId?: string): Promise<ApiResponse> {
    const query = folderId ? `?folderId=${folderId}` : '';
    return this.request(`/api/files${query}`);
  }

  async getSharedFiles(): Promise<ApiResponse<{ files: any[] }>> {
    return this.request<{ files: any[] }>(`/api/files/shared`);
  }

  async deleteFile(fileId: string): Promise<ApiResponse> {
    return this.request(`/api/files/${fileId}`, {
      method: 'DELETE',
    });
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/download`, {
      headers,
    });

    if (!response.ok) {
      throw new Error('Download failed');
    }

    return response.blob();
  }

  async searchFiles(query: string): Promise<ApiResponse> {
    return this.request(`/api/files/search?q=${encodeURIComponent(query)}`);
  }

  // Folder Management methods
  async getFolderTree(parentId?: string): Promise<ApiResponse> {
    const query = parentId ? `?parentId=${parentId}` : '';
    return this.request(`/api/folders/tree${query}`);
  }

  async createFolder(name: string, parentId?: string): Promise<ApiResponse> {
    return this.request('/api/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parentId }),
    });
  }

  async updateFolder(folderId: string, name: string): Promise<ApiResponse> {
    return this.request(`/api/folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteFolder(folderId: string): Promise<ApiResponse> {
    return this.request(`/api/folders/${folderId}`, {
      method: 'DELETE',
    });
  }

  async getFolders(parentId?: string): Promise<ApiResponse> {
    const query = parentId ? `?parentId=${parentId}` : '';
    return this.request(`/api/folders${query}`);
  }

  // Share File
  async shareFile(fileId: string, sharedWithUserId: string, accessLevel: 'read' | 'write' = 'read'): Promise<ApiResponse> {
    return this.request(`/api/files/${fileId}/share`, {
      method: 'POST',
      body: JSON.stringify({ sharedWithUserId, accessLevel }),
    });
  }

  // Share file with multiple users
  async shareFileWithUsers(fileId: string, userIds: string[], accessLevel: 'read' | 'write' = 'read'): Promise<ApiResponse<{ shares: any[] }>> {
    return this.request<{ shares: any[] }>(`/api/files/${fileId}/share`, {
      method: 'POST',
      body: JSON.stringify({ userIds, accessLevel }),
    });
  }

  // Get all users for selection
  async getUsers(): Promise<ApiResponse<{ users: Array<{ id: string; username: string; email: string; firstName?: string; lastName?: string; avatar?: string }> }>> {
    return this.request<{ users: Array<{ id: string; username: string; email: string; firstName?: string; lastName?: string; avatar?: string }> }>('/api/users');
  }

  // Folder sharing methods
  async shareFolderWithUsers(folderId: string, userIds: string[], accessLevel: 'read' | 'write' = 'write'): Promise<ApiResponse<{ shares: any[] }>> {
    return this.request<{ shares: any[] }>(`/api/folders/${folderId}/share`, {
      method: 'POST',
      body: JSON.stringify({ userIds, accessLevel }),
    });
  }

  async getSharedFolders(): Promise<ApiResponse<{ folders: any[] }>> {
    return this.request<{ folders: any[] }>(`/api/folders/shared`);
  }

  // Category Management methods
  async getCategories(): Promise<ApiResponse<{ categories: Array<{ id: string; name: string; slug: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; createdAt: string; updatedAt: string }> }>> {
    return this.request<{ categories: Array<{ id: string; name: string; slug: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; createdAt: string; updatedAt: string }> }>('/api/public/categories');
  }

  async getCategory(id: string): Promise<ApiResponse<{ category: { id: string; name: string; slug: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; createdAt: string; updatedAt: string } }>> {
    return this.request<{ category: { id: string; name: string; slug: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; createdAt: string; updatedAt: string } }>(`/api/public/categories/${id}`);
  }

  async createCategory(data: { name: string; slug: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; subcategoryIds?: string[] }): Promise<ApiResponse<{ category: { id: string; name: string; slug: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; createdAt: string; updatedAt: string } }>> {
    return this.request<{ category: { id: string; name: string; slug: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; createdAt: string; updatedAt: string } }>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(id: string, data: { name?: string; slug?: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; subcategoryIds?: string[] }): Promise<ApiResponse<{ category: { id: string; name: string; slug: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; createdAt: string; updatedAt: string } }>> {
    return this.request<{ category: { id: string; name: string; slug: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; createdAt: string; updatedAt: string } }>(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request<{ deleted: boolean }>(`/api/admin/categories/${id}`, {
      method: 'DELETE',
    });
  }

  async getCategorySubcategories(categoryId: string): Promise<ApiResponse<{ subcategories: Array<{ id: string; name: string; slug: string; description?: string; createdAt: string; updatedAt: string }> }>> {
    const response = await this.request<{ category: { id: string; name: string; slug: string; description?: string; coverImage?: string; showOnMenu?: boolean; menuOrder?: number; createdAt: string; updatedAt: string }; subcategories: Array<{ id: string; name: string; slug: string; description?: string; createdAt: string; updatedAt: string }> }>(`/api/public/categories/${categoryId}`);
    if (response.success && response.data) {
      return {
        ...response,
        data: { subcategories: response.data.subcategories }
      };
    }
    return response as any;
  }

  // Subcategory Management methods
  async getSubcategories(): Promise<ApiResponse<{ subcategories: Array<{ id: string; name: string; slug: string; description?: string; createdAt: string; updatedAt: string }> }>> {
    return this.request<{ subcategories: Array<{ id: string; name: string; slug: string; description?: string; createdAt: string; updatedAt: string }> }>('/api/public/subcategories');
  }

  async getSubcategory(id: string): Promise<ApiResponse<{ subcategory: { id: string; name: string; slug: string; description?: string; createdAt: string; updatedAt: string } }>> {
    return this.request<{ subcategory: { id: string; name: string; slug: string; description?: string; createdAt: string; updatedAt: string } }>(`/api/public/subcategories/${id}`);
  }

  async createSubcategory(data: { name: string; slug: string; description?: string }): Promise<ApiResponse<{ subcategory: { id: string; name: string; slug: string; description?: string; createdAt: string; updatedAt: string } }>> {
    return this.request<{ subcategory: { id: string; name: string; slug: string; description?: string; createdAt: string; updatedAt: string } }>('/api/admin/subcategories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSubcategory(id: string, data: { name?: string; slug?: string; description?: string }): Promise<ApiResponse<{ subcategory: { id: string; name: string; slug: string; description?: string; createdAt: string; updatedAt: string } }>> {
    return this.request<{ subcategory: { id: string; name: string; slug: string; description?: string; createdAt: string; updatedAt: string } }>(`/api/admin/subcategories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSubcategory(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request<{ deleted: boolean }>(`/api/admin/subcategories/${id}`, {
      method: 'DELETE',
    });
  }

  // Publication Management methods
  async getPublications(filters?: {
    status?: 'pending' | 'draft' | 'approved' | 'rejected';
    categoryId?: string;
    subcategoryId?: string;
    authorId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }, page?: number, limit?: number): Promise<ApiResponse<{ publications: Array<any>; pagination: { total: number; page: number; limit: number; totalPages: number } }>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.subcategoryId) params.append('subcategoryId', filters.subcategoryId);
      if (filters.authorId) params.append('authorId', filters.authorId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.search) params.append('search', filters.search);
    }
    
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    return this.request<{ publications: Array<any>; pagination: { total: number; page: number; limit: number; totalPages: number } }>(`/api/admin/posts?${params.toString()}`);
  }

  async createPublication(data: {
    title: string;
    slug: string;
    description?: string;
    metaTitle?: string;
    metaDescription?: string;
    coverImage?: string;
    categoryId: string;
    subcategoryIds?: string[];
    attachmentFileIds?: string[];
    authorIds?: string[];
    status?: 'pending' | 'draft' | 'approved' | 'rejected';
    publicationDate?: string;
    hasComments?: boolean;
    isFeatured?: boolean;
    isLeaderboard?: boolean;
  }): Promise<ApiResponse<{ post: any }>> {
    return this.request<{ post: any }>('/api/admin/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Public Publication methods (no auth required)
  async getPublicPublications(filters?: {
    categoryId?: string;
    subcategoryId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ posts: Array<any> }>> {
    const params = new URLSearchParams();
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.subcategoryId) params.append('subcategoryId', filters.subcategoryId);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const queryString = params.toString();
    return this.request<{ posts: Array<any> }>(`/api/public/posts${queryString ? `?${queryString}` : ''}`);
  }

  async getPublicationBySlug(slug: string): Promise<ApiResponse<{ post: any }>> {
    return this.request<{ post: any }>(`/api/public/posts/${slug}`);
  }

  async searchPublications(query: string, limit?: number, offset?: number): Promise<ApiResponse<{ posts: Array<any> }>> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    return this.request<{ posts: Array<any> }>(`/api/public/posts/search?${params.toString()}`);
  }

  async getFeaturedPublications(limit?: number): Promise<ApiResponse<{ posts: Array<any> }>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    return this.request<{ posts: Array<any> }>(`/api/public/posts/featured${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async getLeaderboardPublications(limit?: number): Promise<ApiResponse<{ posts: Array<any> }>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    return this.request<{ posts: Array<any> }>(`/api/public/posts/leaderboard${params.toString() ? `?${params.toString()}` : ''}`);
  }

  // Nav Links Management methods
  async getNavLinks(): Promise<ApiResponse<{ navLinks: Array<any> }>> {
    return this.request<{ navLinks: Array<any> }>('/api/public/nav-links');
  }

  // Admin Nav Links Management methods
  async getAllNavLinks(): Promise<ApiResponse<{ navLinks: Array<any> }>> {
    return this.request<{ navLinks: Array<any> }>('/api/admin/nav-links');
  }

  async getNavLink(id: string): Promise<ApiResponse<{ navLink: any }>> {
    return this.request<{ navLink: any }>(`/api/admin/nav-links/${id}`);
  }

  async createNavLink(data: { label: string; url?: string; route?: string; external?: boolean; order?: number; isActive?: boolean }): Promise<ApiResponse<{ navLink: any }>> {
    return this.request<{ navLink: any }>('/api/admin/nav-links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateNavLink(id: string, data: { label?: string; url?: string; route?: string; external?: boolean; order?: number; isActive?: boolean }): Promise<ApiResponse<{ navLink: any }>> {
    return this.request<{ navLink: any }>(`/api/admin/nav-links/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteNavLink(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request<{ deleted: boolean }>(`/api/admin/nav-links/${id}`, {
      method: 'DELETE',
    });
  }

  // Analytics methods
  async getDashboardAnalytics(): Promise<ApiResponse<{ analytics: any }>> {
    return this.request<{ analytics: any }>('/api/admin/analytics/dashboard');
  }

  // Publication management methods
  async getPublicationById(id: string): Promise<ApiResponse<{ post: any }>> {
    return this.request<{ post: any }>(`/api/admin/posts/${id}`);
  }

  async updatePublication(id: string, data: {
    title?: string;
    slug?: string;
    description?: string;
    metaTitle?: string;
    metaDescription?: string;
    coverImage?: string;
    categoryId?: string;
    status?: 'pending' | 'draft' | 'approved' | 'rejected';
    publicationDate?: string;
    hasComments?: boolean;
    isFeatured?: boolean;
    isLeaderboard?: boolean;
  }): Promise<ApiResponse<{ post: any }>> {
    return this.request<{ post: any }>(`/api/admin/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async approvePublication(id: string): Promise<ApiResponse<{ post: any }>> {
    return this.request<{ post: any }>(`/api/admin/posts/${id}/approve`, {
      method: 'POST',
    });
  }

  async rejectPublication(id: string): Promise<ApiResponse<{ post: any }>> {
    return this.request<{ post: any }>(`/api/admin/posts/${id}/reject`, {
      method: 'POST',
    });
  }
}

export const apiClient = new ApiClient();
export type { ApiResponse };

