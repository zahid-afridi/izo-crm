import { RootState } from '../store';

// Basic selectors
export const selectDashboardStats = (state: RootState) => state.dashboard.stats;

export const selectDashboardMetrics = (state: RootState) => state.dashboard.metrics;

export const selectDashboardRecentActivity = (state: RootState) => state.dashboard.recentActivity;

export const selectDashboardIsLoading = (state: RootState) => state.dashboard.isLoading;

export const selectDashboardIsInitialized = (state: RootState) => state.dashboard.isInitialized;

export const selectDashboardError = (state: RootState) => state.dashboard.error;

export const selectDashboardLastFetchedRole = (state: RootState) => state.dashboard.lastFetchedRole;

// Derived selectors for specific stats
export const selectTotalProducts = (state: RootState) => state.dashboard.stats.totalProducts?.value || 0;

export const selectActiveSites = (state: RootState) => state.dashboard.stats.activeSites?.value || 0;

export const selectTotalWorkers = (state: RootState) => state.dashboard.stats.totalWorkers?.value || 0;

export const selectTotalOffers = (state: RootState) => state.dashboard.stats.totalOffers?.value || 0;

export const selectActiveClients = (state: RootState) => state.dashboard.stats.activeClients?.value || 0;

export const selectOrdersThisMonth = (state: RootState) => state.dashboard.stats.ordersThisMonth?.value || 0;

export const selectAssignedOrders = (state: RootState) => state.dashboard.stats.assignedOrders?.value || 0;

export const selectProcessingOrders = (state: RootState) => state.dashboard.stats.processingOrders?.value || 0;

export const selectReadyOrders = (state: RootState) => state.dashboard.stats.readyOrders?.value || 0;

export const selectCompletedToday = (state: RootState) => state.dashboard.stats.completedToday?.value || 0;

// Metrics selectors
export const selectActiveWorkers = (state: RootState) => state.dashboard.metrics.activeWorkers;

export const selectWorkerUtilization = (state: RootState) => state.dashboard.metrics.workerUtilization;

export const selectTodayAssignments = (state: RootState) => state.dashboard.metrics.todayAssignments;

export const selectActiveTeams = (state: RootState) => state.dashboard.metrics.activeTeams;

export const selectOfferAcceptanceRate = (state: RootState) => state.dashboard.metrics.offerAcceptanceRate;

export const selectOrderCompletionRate = (state: RootState) => state.dashboard.metrics.orderCompletionRate;

export const selectSiteCompletionRate = (state: RootState) => state.dashboard.metrics.siteCompletionRate;
