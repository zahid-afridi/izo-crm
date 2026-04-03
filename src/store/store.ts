import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import workersReducer from './slices/workersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workers: workersReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization checks
        ignoredActions: ['auth/checkAuth/fulfilled', 'auth/login/fulfilled'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
