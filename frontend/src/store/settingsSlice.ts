import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '@/utils/apiClient';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/utils/cacheUtils';

export interface PublicSettings {
  site?: {
    name?: string;
    description?: string;
    tagline?: string;
    url?: string;
  };
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  };
  social?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  logo?: string;
  favicon?: string;
}

interface SettingsState {
  settings: PublicSettings | null;
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  settings: null,
  loading: false,
  error: null,
};

// Async thunk to fetch public settings
export const fetchPublicSettings = createAsyncThunk(
  'settings/fetchPublicSettings',
  async (_, { rejectWithValue }) => {
    // Try to get cached data first
    const cachedData = getCachedData<PublicSettings>(CACHE_KEYS.PUBLIC_SETTINGS);
    if (cachedData) {
      // Return cached data immediately, but still fetch fresh data in background
      setTimeout(() => {
        // Fetch fresh data and update cache
        apiClient.getPublicSettings()
          .then(response => {
            if (response.success && response.data?.settings) {
              setCachedData(CACHE_KEYS.PUBLIC_SETTINGS, response.data.settings as PublicSettings);
            }
          })
          .catch(error => console.error('Background fetch failed:', error));
      }, 0);
      return cachedData;
    }

    // No cache or expired, fetch fresh data
    const response = await apiClient.getPublicSettings();
    if (!response.success || !response.data) {
      return rejectWithValue(response.error?.message || 'Failed to fetch settings');
    }
    const settings = response.data.settings as PublicSettings;
    setCachedData(CACHE_KEYS.PUBLIC_SETTINGS, settings);
    return settings;
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    clearSettings: (state) => {
      state.settings = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublicSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPublicSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchPublicSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'string' ? action.payload : 'Failed to fetch settings';
      });
  },
});

export const { clearSettings } = settingsSlice.actions;
export default settingsSlice.reducer;

