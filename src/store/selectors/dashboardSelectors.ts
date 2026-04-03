import { RootState } from '../store';

// Basic selectors
export const selectDashboardData = (state: RootState) => state.dashboard.data;

export const selectDashboardIsLoading = (state: RootState) => state.dashboard.isLoading;

export const selectDashboardIsInitialized = (state: RootState) => state.dashboard.isInitialized;

export const selectDashboardError = (state: RootState) => state.dashboard.error;

// Derived selectors
export const selectDashboardStats = (state: RootState) => state.dashboard.data?.stats || {};

export const selectDashboardMetrics = (state: RootState) => state.dashboard.data?.metrics || null;

export const selectDashboardRecentActivity = (state: RootState) => state.dashboard.data?.recentActivity || [];

export const selectDashboardQuickActions = (state: RootState) => state.dashboard.data?.quickActions || [];

export const selectDashboardSummary = (state: RootState) => state.dashboard.data?.summary || null;

export const selectDashboardLastUpdated = (state: RootState) => state.dashboard.data?.summary?.lastUpdated || null;
