'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchDashboard,
  clearError,
  invalidateCache,
} from '@/store/slices/dashboardSlice';
import {
  selectDashboardData,
  selectDashboardIsLoading,
  selectDashboardIsInitialized,
  selectDashboardError,
  selectDashboardStats,
  selectDashboardMetrics,
  selectDashboardRecentActivity,
  selectDashboardQuickActions,
  selectDashboardSummary,
} from '@/store/selectors/dashboardSelectors';

export function useDashboard(role: string) {
  const dispatch = useAppDispatch();

  const data = useAppSelector(selectDashboardData);
  const isLoading = useAppSelector(selectDashboardIsLoading);
  const isInitialized = useAppSelector(selectDashboardIsInitialized);
  const error = useAppSelector(selectDashboardError);
  const stats = useAppSelector(selectDashboardStats);
  const metrics = useAppSelector(selectDashboardMetrics);
  const recentActivity = useAppSelector(selectDashboardRecentActivity);
  const quickActions = useAppSelector(selectDashboardQuickActions);
  const summary = useAppSelector(selectDashboardSummary);

  const handleFetchDashboard = async (forceRefresh = false) => {
    return dispatch(fetchDashboard({ role, forceRefresh }));
  };

  const handleClearError = () => {
    dispatch(clearError());
  };

  const handleInvalidateCache = () => {
    dispatch(invalidateCache());
  };

  return {
    // State
    data,
    isLoading,
    isInitialized,
    error,
    stats,
    metrics,
    recentActivity,
    quickActions,
    summary,

    // Actions
    fetchDashboard: handleFetchDashboard,
    clearError: handleClearError,
    invalidateCache: handleInvalidateCache,
  };
}
