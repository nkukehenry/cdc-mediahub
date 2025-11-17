import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '@/utils/apiClient';
import { getCachedData, setCachedData, CACHE_KEYS } from '@/utils/cacheUtils';

const YOUTUBE_CACHE_EXPIRY = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

export interface YouTubeLiveEvent {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
  scheduledStartTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  viewCount?: number;
  concurrentViewers?: number;
  videoUrl: string;
  status: 'live' | 'upcoming' | 'recent_video';
  isLive: boolean;
  type: 'live' | 'upcoming' | 'recent_video' | '';
}

interface YouTubeState {
  liveEvents: YouTubeLiveEvent[];
  loading: boolean;
  error: string | null;
}

const initialState: YouTubeState = {
  liveEvents: [],
  loading: false,
  error: null,
};

// Async thunk
export const fetchYouTubeLiveEvents = createAsyncThunk(
  'youtube/fetchLiveEvents',
  async () => {
    // Try to get cached data first
    const cachedData = getCachedData<YouTubeLiveEvent[]>(CACHE_KEYS.YOUTUBE_LIVE_EVENTS);
    if (cachedData && cachedData.length > 0) {
      // Return cached data immediately, but still fetch fresh data in background
      setTimeout(() => {
        apiClient.getYouTubeLiveEvents()
          .then(response => {
            if (response.success && response.data?.events) {
              setCachedData(CACHE_KEYS.YOUTUBE_LIVE_EVENTS, response.data.events, YOUTUBE_CACHE_EXPIRY);
            }
          })
          .catch(error => console.error('Background fetch failed:', error));
      }, 0);
      return cachedData;
    }

    // No cache or expired, fetch fresh data
    const response = await apiClient.getYouTubeLiveEvents();
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch YouTube live events');
    }
    const events = response.data.events as YouTubeLiveEvent[];
    setCachedData(CACHE_KEYS.YOUTUBE_LIVE_EVENTS, events, YOUTUBE_CACHE_EXPIRY);
    return events;
  }
);

// Slice
const youtubeSlice = createSlice({
  name: 'youtube',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchYouTubeLiveEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchYouTubeLiveEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.liveEvents = action.payload;
      })
      .addCase(fetchYouTubeLiveEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch YouTube live events';
      });
  },
});

export const { clearError } = youtubeSlice.actions;
export default youtubeSlice.reducer;
