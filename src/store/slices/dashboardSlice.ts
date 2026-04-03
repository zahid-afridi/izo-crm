import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface DashboardStats {
  value: number;
  label: string;
  icon: string;
  color: string;
  change: string;
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

export interface ActivityLog {
  id: string;
  action: string;
  module: string;
  description: string;
  user: string;
  userRole: string;
  timestamp: string;
  timeAgo: string;
}

export interface QuickAction {
  titleKey: string;
  descKey: string;
  icon: string;
  action: string;
  color: string;
}

export interface DashboardData {
  stats: Record<string, DashboardStats>;
  metrics: DashboardMetrics;
  recentActivity: ActivityLog[];
  quickActions: QuickAction[];
  summary: {
    totalModules: number;
    hasFullAccess: boolean;
    lastUpdated: string;
  };
}

export interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  lastFetchedRole: string | null;
  lastFetchedTime: number | null;
}

const initialState: DashboardState = {
  data: null,
  isLoading: false,
  isInitialized: false,
  error: null,
  lastFetchedRole: null,
  lastFetchedTime: null,
};

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

let pendingFetchRequest: Promise<any> | null = null;

/**
 * Sanitize data to ensure it's fully serializable
 */
function sanitizeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  // For objects, recursively sanitize all properties
  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      
      // Skip functions and symbols
      if (typeof value === 'function' || typeof value === 'symbol') {
        continue;
      }

      sanitized[key] = sanitizeData(value);
    }
  }

  return sanitized;
}

/**
 * Fetch dashboard data with deduplication and caching
 */
export const fetchDashboard = createAsyncThunk(
  'dashboard/fetchDashboard',
  async (
    { role, forceRefresh = false }: { role: string; forceRefresh?: boolean },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState() as any;
      const dashboardState = state.dashboard;

      // Check cache validity
      const now = Date.now();
      const isCacheValid =
        dashboardState.data &&
        dashboardState.lastFetchedRole === role &&
        dashboardState.lastFetchedTime &&
        now - dashboardState.lastFetchedTime < CACHE_DURATION &&
        !forceRefresh;

      if (isCacheValid) {
        return dashboardState.data;
      }

      // Deduplicate requests
      if (pendingFetchRequest) {
        return pendingFetchRequest;
      }

      const request = fetch(`/api/dashboard?role=${role}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      pendingFetchRequest = request;
      const response = await request;

      if (!response.ok) {
        pendingFetchRequest = null;
        return rejectWithValue('Failed to fetch dashboard data');
      }

      const result = await response.json();
      pendingFetchRequest = null;

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to load dashboard data');
      }

      // Sanitize all data to ensure it's serializable
      const sanitizedData = sanitizeData(result.data);
      
      return sanitizedData;
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
    invalidateCache: (state) => {
      state.lastFetchedTime = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        // Keep old data visible while loading
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        // Sanitize payload before storing
        const sanitizedPayload = sanitizeData(action.payload);
        state.data = sanitizedPayload;
        state.isLoading = false;
        state.isInitialized = true;
        state.lastFetchedTime = Date.now();
        // Extract role from the thunk argument
        const role = (action.meta.arg as any).role;
        state.lastFetchedRole = role;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        // Keep old data visible on error
      });
  },
});

export const { clearError, invalidateCache } = dashboardSlice.actions;
export default dashboardSlice.reducer;
