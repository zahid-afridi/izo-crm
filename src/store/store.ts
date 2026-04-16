import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import workersReducer from './slices/workersSlice';
import dashboardReducer from './slices/dashboardSlice';
import sitesReducer from './slices/sitesSlice';
import carsReducer from './slices/carsSlice';
import teamsReducer from './slices/teamsSlice';
import clientsReducer from './slices/clientsSlice';
import offersReducer from './slices/offersSlice';
import ordersReducer from './slices/ordersSlice';
import websiteManagerReducer from './slices/websiteManagerSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workers: workersReducer,
    dashboard: dashboardReducer,
    sites: sitesReducer,
    cars: carsReducer,
    teams: teamsReducer,
    clients: clientsReducer,
    offers: offersReducer,
    orders: ordersReducer,
    websiteManager: websiteManagerReducer,
    settings: settingsReducer,
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
