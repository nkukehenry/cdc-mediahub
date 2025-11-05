import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '@/utils/apiClient';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/utils/cacheUtils';

export interface NavLink {
  id: string;
  label: string;
  url?: string;
  route?: string;
  external: boolean;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NavLinksState {
  navLinks: NavLink[];
  loading: boolean;
  error: string | null;
}

const initialState: NavLinksState = {
  navLinks: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchNavLinks = createAsyncThunk(
  'navLinks/fetchNavLinks',
  async (_, { rejectWithValue }) => {
    // Try to get cached data first
    const cachedData = getCachedData<NavLink[]>(CACHE_KEYS.NAV_LINKS);
    if (cachedData && cachedData.length > 0) {
      // Return cached data immediately, but still fetch fresh data in background
      setTimeout(() => {
        // Fetch fresh data and update cache
        apiClient.getNavLinks()
          .then(response => {
            if (response.success && response.data) {
              setCachedData(CACHE_KEYS.NAV_LINKS, response.data.navLinks as NavLink[]);
            }
          })
          .catch(error => console.error('Background fetch failed:', error));
      }, 0);
      return cachedData;
    }

    // No cache or expired, fetch fresh data
    const response = await apiClient.getNavLinks();
    if (!response.success || !response.data) {
      return rejectWithValue(response.error?.message || 'Failed to fetch nav links');
    }
    const navLinks = response.data.navLinks as NavLink[];
    setCachedData(CACHE_KEYS.NAV_LINKS, navLinks);
    return navLinks;
  }
);

const navLinksSlice = createSlice({
  name: 'navLinks',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNavLinks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNavLinks.fulfilled, (state, action) => {
        state.loading = false;
        state.navLinks = action.payload;
      })
      .addCase(fetchNavLinks.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'string' ? action.payload : 'Failed to fetch nav links';
      });
  },
});

export default navLinksSlice.reducer;

