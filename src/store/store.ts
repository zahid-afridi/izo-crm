import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import workersReducer from './slices/workersSlice';
import dashboardReducer from './slices/dashboardSlice';
import sitesReducer from './slices/sitesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workers: workersReducer,
    dashboard: dashboardReducer,
    sites: sitesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization checks
        ignoredActions: [
          'auth/checkAuth/fulfilled',
          'auth/login/fulfilled',
          'dashboard/fetchDashboard/fulfilled',
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          'dashboard.data',
          'dashboard.data.stats',
          'dashboard.data.metrics',
          'dashboard.data.recentActivity',
          'dashboard.data.quickActions',
          'dashboard.data.summary',
        ],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
