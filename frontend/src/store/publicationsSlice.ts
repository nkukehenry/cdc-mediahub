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
  youtubeUrl?: string;
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

// Helper to create cache key for publications with filters
function getPublicationsCacheKey(filters?: any, page?: number, limit?: number): string {
  const keyParts = ['cache_publications'];
  if (filters) {
    if (filters.search) keyParts.push(`search:${encodeURIComponent(filters.search)}`);
    if (filters.categoryId) keyParts.push(`cat:${filters.categoryId}`);
    if (filters.subcategoryId) keyParts.push(`subcat:${filters.subcategoryId}`);
    if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
      keyParts.push(`tags:${[...filters.tags].sort().join(',')}`);
    }
    if (filters.author) keyParts.push(`author:${encodeURIComponent(filters.author)}`);
    if (filters.creator) keyParts.push(`creator:${encodeURIComponent(filters.creator)}`);
    if (filters.yearFrom) keyParts.push(`yearFrom:${filters.yearFrom}`);
    if (filters.yearTo) keyParts.push(`yearTo:${filters.yearTo}`);
    if (filters.publicationDate) keyParts.push(`date:${filters.publicationDate}`);
    if (filters.source) keyParts.push(`source:${encodeURIComponent(filters.source)}`);
  }
  keyParts.push(`page:${page || 1}`);
  keyParts.push(`limit:${limit || 12}`);
  return keyParts.join('_');
}

// Async thunks
export const fetchLatestPublications = createAsyncThunk(
  'publications/fetchLatestPublications',
  async (limit: number = 12, { dispatch }) => {
    // Try to get cached data first
    const cachedData = getCachedData<Publication[]>(CACHE_KEYS.LATEST_PUBLICATIONS);
    const hasCache = cachedData && cachedData.length > 0;
    
    // Always fetch fresh data in the background (fire and forget)
    const fetchFresh = async () => {
      try {
        const response = await apiClient.getPublicPublications({
          limit,
          offset: 0,
        });
        if (response.success && response.data) {
          const publications = response.data.posts as Publication[];
          // Update cache
          setCachedData(CACHE_KEYS.LATEST_PUBLICATIONS, publications);
          // Update Redux state with fresh data (silently, without loading state)
          dispatch(updateLatestPublications(publications));
        }
      } catch (error) {
        console.error('Background fetch failed:', error);
        // Silently fail - we already have cached data displayed
      }
    };
    
    // If we have cache, return it immediately and fetch fresh in background
    if (hasCache) {
      // Set loading to false immediately since we have cached data
      dispatch(setLoading(false));
      // Start background fetch (fire and forget - don't await)
      fetchFresh().catch(error => console.error('Background fetch error:', error));
      return cachedData;
    }

    // No cache, fetch and return fresh data
    dispatch(setLoading(true));
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
  async ({ filters, page, limit }: { filters?: any; page?: number; limit?: number }, { dispatch }) => {
    const offset = page ? (page - 1) * (limit || 12) : 0;
    const cacheKey = getPublicationsCacheKey(filters, page, limit);
    
    // Try to get cached data first
    const cachedData = getCachedData<{ publications: Publication[]; pagination: PublicationsState['pagination'] }>(cacheKey);
    const hasCache = cachedData && cachedData.publications && cachedData.publications.length > 0;
    
    // Always fetch fresh data in the background (fire and forget)
    const fetchFresh = async () => {
      try {
        const response = await apiClient.getPublicPublications({
          ...filters,
          limit: limit || 12,
          offset,
        });
        if (!response.success || !response.data) {
          console.error('Background fetch failed:', response.error?.message);
          return;
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
        
        const result = {
          publications: publications as Publication[],
          pagination,
        };
        
        // Update cache
        setCachedData(cacheKey, result);
        // Update Redux state with fresh data (silently, without loading state)
        dispatch(updatePublications(result));
      } catch (error) {
        console.error('Background fetch failed:', error);
        // Silently fail - we already have cached data displayed
      }
    };
    
    // If we have cache, return it immediately and fetch fresh in background
    if (hasCache) {
      // Set loading to false immediately since we have cached data
      dispatch(setLoading(false));
      // Start background fetch (fire and forget - don't await)
      fetchFresh().catch(error => console.error('Background fetch error:', error));
      return cachedData;
    }

    // No cache, fetch and return fresh data
    dispatch(setLoading(true));
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
    
    const result = {
      publications: publications as Publication[],
      pagination,
    };
    
    // Update cache
    setCachedData(cacheKey, result);
    return result;
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
    updateLatestPublications: (state, action: PayloadAction<Publication[]>) => {
      state.latestPublications = action.payload;
      // Don't set loading to false here - it's a background update
    },
    updatePublications: (state, action: PayloadAction<{ publications: Publication[]; pagination: PublicationsState['pagination'] }>) => {
      state.publications = action.payload.publications;
      state.pagination = action.payload.pagination;
      // Don't set loading to false here - it's a background update
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch latest publications
      .addCase(fetchLatestPublications.pending, (state) => {
        state.error = null;
        // Loading will be set based on cache availability in the thunk
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
        state.error = null;
        // Loading will be set based on cache availability in the thunk
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

export const { clearError, updateLatestPublications, updatePublications, setLoading } = publicationsSlice.actions;
export default publicationsSlice.reducer;

