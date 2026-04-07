import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import workersReducer from './slices/workersSlice';
import dashboardReducer from './slices/dashboardSlice';
import sitesReducer from './slices/sitesSlice';
import carsReducer from './slices/carsSlice';
import teamsReducer from './slices/teamsSlice';
import assignmentsReducer from './slices/assignmentsSlice';
import clientsReducer from './slices/clientsSlice';
import workerProfileReducer from './slices/workerProfileSlice';
import offersReducer from './slices/offersSlice';
import ordersReducer from './slices/ordersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workers: workersReducer,
    dashboard: dashboardReducer,
    sites: sitesReducer,
    cars: carsReducer,
    teams: teamsReducer,
    assignments: assignmentsReducer,
    clients: clientsReducer,
    workerProfile: workerProfileReducer,
    offers: offersReducer,
    orders: ordersReducer,
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
