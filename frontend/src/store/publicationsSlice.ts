import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/utils/apiClient';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/utils/cacheUtils';

export interface Publication {
  id: string;
  title: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  coverImage?: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  subcategories?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  creatorId: string;
  creator?: {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  authors?: Array<{
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }>;
  status: 'pending' | 'draft' | 'approved' | 'rejected';
  publicationDate?: string;
  hasComments: boolean;
  views: number;
  uniqueHits: number;
  isFeatured: boolean;
  isLeaderboard: boolean;
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  createdAt: string;
  updatedAt: string;
  attachments?: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
    filePath: string;
    downloadUrl?: string;
  }>;
  tags?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  comments?: number;
  likes?: number;
}

interface PublicationsState {
  publications: Publication[];
  latestPublications: Publication[];
  currentPublication: Publication | null;
  relatedPublications: Publication[];
  loading: boolean;
  error: string | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null;
}

const initialState: PublicationsState = {
  publications: [],
  latestPublications: [],
  currentPublication: null,
  relatedPublications: [],
  loading: false,
  error: null,
  pagination: null,
};

// Async thunks
export const fetchLatestPublications = createAsyncThunk(
  'publications/fetchLatestPublications',
  async (limit: number = 6) => {
    // Try to get cached data first
    const cachedData = getCachedData<Publication[]>(CACHE_KEYS.LATEST_PUBLICATIONS);
    if (cachedData && cachedData.length > 0) {
      // Return cached data immediately, but still fetch fresh data in background
      setTimeout(() => {
        apiClient.getPublicPublications({ limit, offset: 0 })
          .then(response => {
            if (response.success && response.data) {
              setCachedData(CACHE_KEYS.LATEST_PUBLICATIONS, response.data.posts as Publication[]);
            }
          })
          .catch(error => console.error('Background fetch failed:', error));
      }, 0);
      return cachedData;
    }

    // No cache or expired, fetch fresh data
    const response = await apiClient.getPublicPublications({
      limit,
      offset: 0,
    });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch latest publications');
    }
    const publications = response.data.posts as Publication[];
    setCachedData(CACHE_KEYS.LATEST_PUBLICATIONS, publications);
    return publications;
  }
);

export const fetchPublications = createAsyncThunk(
  'publications/fetchPublications',
  async ({ filters, page, limit }: { filters?: any; page?: number; limit?: number }) => {
    const offset = page ? (page - 1) * (limit || 12) : 0;
    const response = await apiClient.getPublicPublications({
      ...filters,
      limit: limit || 12,
      offset,
    });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch publications');
    }
    const publications = response.data.posts || [];
    
    // Use pagination from backend if available, otherwise calculate from current results
    let pagination;
    if (response.data.pagination) {
      pagination = response.data.pagination;
    } else {
      const total = publications.length;
      const totalPages = Math.ceil(total / (limit || 12));
      pagination = {
        total,
        page: page || 1,
        limit: limit || 12,
        totalPages,
      };
    }
    
    return {
      publications: publications as Publication[],
      pagination,
    };
  }
);

export const fetchPublicationBySlug = createAsyncThunk(
  'publications/fetchPublicationBySlug',
  async (slug: string) => {
    const response = await apiClient.getPublicationBySlug(slug);
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch publication');
    }
    return response.data.post as Publication;
  }
);

export const fetchRelatedPublications = createAsyncThunk(
  'publications/fetchRelatedPublications',
  async ({ categoryId, excludeId, limit = 6 }: { categoryId: string; excludeId: string; limit?: number }) => {
    const response = await apiClient.getPublicPublications({
      categoryId,
      limit,
    });
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch related publications');
    }
    // Filter out the current publication
    const related = (response.data.posts as Publication[]).filter(p => p.id !== excludeId);
    return related.slice(0, limit);
  }
);

// Slice
const publicationsSlice = createSlice({
  name: 'publications',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch latest publications
      .addCase(fetchLatestPublications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLatestPublications.fulfilled, (state, action) => {
        state.loading = false;
        state.latestPublications = action.payload;
      })
      .addCase(fetchLatestPublications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch latest publications';
      })
      // Fetch publications
      .addCase(fetchPublications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublications.fulfilled, (state, action) => {
        state.loading = false;
        state.publications = action.payload.publications;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPublications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch publications';
        state.pagination = null;
      })
      // Fetch publication by slug
      .addCase(fetchPublicationBySlug.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublicationBySlug.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPublication = action.payload;
      })
      .addCase(fetchPublicationBySlug.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch publication';
        state.currentPublication = null;
      })
      // Fetch related publications
      .addCase(fetchRelatedPublications.pending, (state) => {
        // Don't set loading to true for related publications to avoid blocking UI
      })
      .addCase(fetchRelatedPublications.fulfilled, (state, action) => {
        state.relatedPublications = action.payload;
      })
      .addCase(fetchRelatedPublications.rejected, (state, action) => {
        state.relatedPublications = [];
      });
  },
});

export const { clearError } = publicationsSlice.actions;
export default publicationsSlice.reducer;

