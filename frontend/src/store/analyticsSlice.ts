import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '@/utils/apiClient';

export interface DashboardAnalytics {
  overview: {
    totalUsers: number;
    totalPosts: number;
    totalCategories: number;
    totalSubcategories: number;
    totalViews: number;
    totalUniqueHits: number;
  };
  publicationStats: {
    byStatus: Array<{ status: string; count: number }>;
    byCategory: Array<{ categoryName: string; count: number }>;
    featured: number;
    leaderboard: number;
  };
  monthlyVisitorStats: Array<{
    month: string;
    views: number;
    uniqueHits: number;
  }>;
  topPosts: Array<{
    id: string;
    title: string;
    views: number;
    uniqueHits: number;
    categoryName: string;
  }>;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    publicationCount: number;
    totalViews: number;
  }>;
  userActivity: {
    totalActiveUsers: number;
    newUsersThisMonth: number;
    newUsersThisYear: number;
  };
}

interface AnalyticsState {
  analytics: DashboardAnalytics | null;
  loading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  analytics: null,
  loading: false,
  error: null,
};

export const fetchDashboardAnalytics = createAsyncThunk(
  'analytics/fetchDashboardAnalytics',
  async (_, { rejectWithValue }) => {
    const response = await apiClient.getDashboardAnalytics();
    if (!response.success || !response.data) {
      return rejectWithValue(response.error?.message || 'Failed to fetch analytics');
    }
    return response.data.analytics as DashboardAnalytics;
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchDashboardAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = typeof action.payload === 'string' ? action.payload : 'Failed to fetch analytics';
      });
  },
});

export default analyticsSlice.reducer;

