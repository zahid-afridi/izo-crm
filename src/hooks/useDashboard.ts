'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchDashboardData, clearError } from '@/store/slices/dashboardSlice';
import {
  selectDashboardStats,
  selectDashboardMetrics,
  selectDashboardRecentActivity,
  selectDashboardIsLoading,
  selectDashboardIsInitialized,
  selectDashboardError,
  selectDashboardLastFetchedRole,
  selectTotalProducts,
  selectActiveSites,
  selectTotalWorkers,
  selectTotalOffers,
  selectActiveClients,
  selectOrdersThisMonth,
  selectAssignedOrders,
  selectProcessingOrders,
  selectReadyOrders,
  selectCompletedToday,
  selectActiveWorkers,
  selectWorkerUtilization,
  selectTodayAssignments,
  selectActiveTeams,
  selectOfferAcceptanceRate,
  selectOrderCompletionRate,
  selectSiteCompletionRate,
} from '@/store/selectors/dashboardSelectors';

export function useDashboard() {
  const dispatch = useAppDispatch();

  // Basic state
  const stats = useAppSelector(selectDashboardStats);
  const metrics = useAppSelector(selectDashboardMetrics);
  const recentActivity = useAppSelector(selectDashboardRecentActivity);
  const isLoading = useAppSelector(selectDashboardIsLoading);
  const isInitialized = useAppSelector(selectDashboardIsInitialized);
  const error = useAppSelector(selectDashboardError);
  const lastFetchedRole = useAppSelector(selectDashboardLastFetchedRole);

  // Individual stat selectors
  const totalProducts = useAppSelector(selectTotalProducts);
  const activeSites = useAppSelector(selectActiveSites);
  const totalWorkers = useAppSelector(selectTotalWorkers);
  const totalOffers = useAppSelector(selectTotalOffers);
  const activeClients = useAppSelector(selectActiveClients);
  const ordersThisMonth = useAppSelector(selectOrdersThisMonth);
  const assignedOrders = useAppSelector(selectAssignedOrders);
  const processingOrders = useAppSelector(selectProcessingOrders);
  const readyOrders = useAppSelector(selectReadyOrders);
  const completedToday = useAppSelector(selectCompletedToday);

  // Metrics selectors
  const activeWorkers = useAppSelector(selectActiveWorkers);
  const workerUtilization = useAppSelector(selectWorkerUtilization);
  const todayAssignments = useAppSelector(selectTodayAssignments);
  const activeTeams = useAppSelector(selectActiveTeams);
  const offerAcceptanceRate = useAppSelector(selectOfferAcceptanceRate);
  const orderCompletionRate = useAppSelector(selectOrderCompletionRate);
  const siteCompletionRate = useAppSelector(selectSiteCompletionRate);

  const handleFetchDashboardData = async (role: string) => {
    // Only fetch if role changed or not initialized
    if (lastFetchedRole === role && isInitialized) {
      return;
    }
    return dispatch(fetchDashboardData(role));
  };

  return {
    // State
    stats,
    metrics,
    recentActivity,
    isLoading,
    isInitialized,
    error,
    lastFetchedRole,

    // Individual stats
    totalProducts,
    activeSites,
    totalWorkers,
    totalOffers,
    activeClients,
    ordersThisMonth,
    assignedOrders,
    processingOrders,
    readyOrders,
    completedToday,

    // Metrics
    activeWorkers,
    workerUtilization,
    todayAssignments,
    activeTeams,
    offerAcceptanceRate,
    orderCompletionRate,
    siteCompletionRate,

    // Actions
    fetchDashboardData: handleFetchDashboardData,
    clearError: () => dispatch(clearError()),
  };
}
