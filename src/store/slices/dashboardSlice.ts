import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface DashboardStats {
  totalProducts?: { value: number; change: string };
  activeSites?: { value: number; change: string };
  totalWorkers?: { value: number; change: string };
  totalOffers?: { value: number; change: string };
  activeClients?: { value: number; change: string };
  ordersThisMonth?: { value: number; change: string };
  assignedOrders?: { value: number; change: string };
  processingOrders?: { value: number; change: string };
  readyOrders?: { value: number; change: string };
  completedToday?: { value: number; change: string };
}

export interface DashboardMetrics {
  totalServices: number;
  completedSites: number;
  siteCompletionRate: number;
  acceptedOffers: number;
  offerAcceptanceRate: number;
  completedOrders: number;
  orderCompletionRate: number;
  activeWorkers: number;
  workerUtilization: number;
  todayAssignments: number;
  activeTeams: number;
}

export interface RecentActivity {
  id: string;
  action: string;
  module: string;
  description: string;
  user: string;
  userRole: string;
  timestamp: string;
  timeAgo: string;
}

export interface DashboardState {
  stats: DashboardStats;
  metrics: DashboardMetrics;
  recentActivity: RecentActivity[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  lastFetchedRole: string | null;
}

const initialState: DashboardState = {
  stats: {},
  metrics: {
    totalServices: 0,
    completedSites: 0,
    siteCompletionRate: 0,
    acceptedOffers: 0,
    offerAcceptanceRate: 0,
    completedOrders: 0,
    orderCompletionRate: 0,
    activeWorkers: 0,
    workerUtilization: 0,
    todayAssignments: 0,
    activeTeams: 0,
  },
  recentActivity: [],
  isLoading: false,
  isInitialized: false,
  error: null,
  lastFetchedRole: null,
};

let pendingFetchRequest: Promise<any> | null = null;

/**
 * Fetch dashboard data with deduplication
 */
export const fetchDashboardData = createAsyncThunk(
  'dashboard/fetchDashboardData',
  async (role: string, { rejectWithValue }) => {
    // Prevent duplicate requests for the same role
    if (pendingFetchRequest) {
      return pendingFetchRequest;
    }

    try {
      const request = fetch(`/api/dashboard?role=${encodeURIComponent(role)}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      pendingFetchRequest = request;
      const response = await request;

      if (!response.ok) {
        pendingFetchRequest = null;
        return rejectWithValue('Failed to fetch dashboard data');
      }

      const data = await response.json();
      pendingFetchRequest = null;

      if (!data.success) {
        return rejectWithValue(data.error || 'Failed to load dashboard data');
      }

      // Serialize data to ensure no non-serializable values
      return JSON.parse(JSON.stringify(data.data));
    } catch (error) {
      pendingFetchRequest = null;
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to fetch dashboard data'
      );
    }
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        const data = action.payload;

        // Update stats
        state.stats = data.stats || {};

        // Update metrics
        if (data.metrics) {
          state.metrics = {
            totalServices: data.metrics.totalServices || 0,
            completedSites: data.metrics.completedSites || 0,
            siteCompletionRate: data.metrics.siteCompletionRate || 0,
            acceptedOffers: data.metrics.acceptedOffers || 0,
            offerAcceptanceRate: data.metrics.offerAcceptanceRate || 0,
            completedOrders: data.metrics.completedOrders || 0,
            orderCompletionRate: data.metrics.orderCompletionRate || 0,
            activeWorkers: data.metrics.activeWorkers || 0,
            workerUtilization: data.metrics.workerUtilization || 0,
            todayAssignments: data.metrics.todayAssignments || 0,
            activeTeams: data.metrics.activeTeams || 0,
          };
        }

        // Update recent activity
        state.recentActivity = data.recentActivity || [];

        state.isLoading = false;
        state.isInitialized = true;
        state.lastFetchedRole = action.meta.arg;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
