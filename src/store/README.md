# Redux Store Architecture

This document outlines the Redux Toolkit setup for state management across the application.

## Directory Structure

```
src/store/
├── store.ts                 # Redux store configuration
├── hooks.ts                 # Pre-typed Redux hooks
├── provider.tsx             # Redux Provider component
├── slices/
│   ├── authSlice.ts        # Auth state and async thunks
│   └── [future slices]     # Other domain slices
└── selectors/
    ├── authSelectors.ts    # Auth state selectors
    └── [future selectors]  # Other domain selectors
```

## Core Concepts

### 1. Store Configuration (`store.ts`)

The Redux store is configured with:
- Redux Toolkit's `configureStore` for simplified setup
- Middleware configuration for serialization checks
- Type-safe RootState and AppDispatch exports

### 2. Slices (`slices/`)

Each domain (auth, users, assignments, etc.) has its own slice containing:
- **State interface**: Defines the shape of the state
- **Initial state**: Default values
- **Async thunks**: Handle API calls and side effects
- **Reducers**: Synchronous state updates
- **Extra reducers**: Handle async thunk lifecycle (pending, fulfilled, rejected)

### 3. Selectors (`selectors/`)

Selectors are pure functions that extract specific parts of the state:
- Prevent unnecessary re-renders by subscribing to only needed data
- Provide a single source of truth for state shape
- Enable easy refactoring of state structure

### 4. Hooks (`hooks.ts`)

Pre-typed Redux hooks for type safety:
- `useAppDispatch`: Typed dispatch hook
- `useAppSelector`: Typed selector hook

## Usage Patterns

### In Components

```typescript
'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';
import { login } from '@/store/slices/authSlice';

export function LoginComponent() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  const handleLogin = async (email: string, password: string) => {
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      // Handle success
    }
  };

  return (
    // JSX
  );
}
```

### Using the Custom Hook

```typescript
import { useAuthRedux } from '@/hooks/useAuthRedux';

export function MyComponent() {
  const { user, isLoading, login, logout } = useAuthRedux();

  return (
    // JSX
  );
}
```

## Async Thunks

Async thunks handle API calls and automatically dispatch pending/fulfilled/rejected actions:

```typescript
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiGet('/api/users');
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue('Failed to fetch users');
    }
  }
);
```

## Performance Optimization

### 1. Selector Memoization

Selectors prevent unnecessary re-renders:

```typescript
// ✅ Good: Only re-renders when user changes
const user = useAppSelector(selectAuthUser);

// ❌ Avoid: Re-renders on any state change
const { user } = useAppSelector((state) => state.auth);
```

### 2. Async Thunk Caching

Implement request deduplication to reduce API calls:

```typescript
let pendingRequest: Promise<any> | null = null;

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    // Return pending request if already in flight
    if (pendingRequest) {
      return pendingRequest;
    }

    pendingRequest = apiGet('/api/users');
    const result = await pendingRequest;
    pendingRequest = null;

    if (result.error) {
      return rejectWithValue(result.error);
    }
    return result.data;
  }
);
```

### 3. Normalized State

For large collections, normalize state to prevent duplication:

```typescript
interface UsersState {
  byId: Record<string, User>;
  allIds: string[];
  isLoading: boolean;
}
```

## Adding New Slices

### Step 1: Create the slice

```typescript
// src/store/slices/usersSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue }) => {
    // Implementation
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Handle async thunks
  },
});

export default usersSlice.reducer;
```

### Step 2: Add to store

```typescript
// src/store/store.ts
import usersReducer from './slices/usersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer, // Add here
  },
});
```

### Step 3: Create selectors

```typescript
// src/store/selectors/usersSelectors.ts
export const selectAllUsers = (state: RootState) => state.users.allIds.map(id => state.users.byId[id]);
export const selectUserById = (id: string) => (state: RootState) => state.users.byId[id];
```

## Best Practices

1. **Use selectors**: Always use selectors instead of accessing state directly
2. **Normalize state**: For collections, use normalized state structure
3. **Handle loading states**: Always track isLoading and error states
4. **Async thunk error handling**: Use rejectWithValue for consistent error handling
5. **Type safety**: Leverage TypeScript for type-safe state and actions
6. **Middleware**: Use middleware for logging, analytics, or side effects
7. **DevTools**: Use Redux DevTools for debugging (automatically enabled in dev)

## Debugging

### Redux DevTools

Redux DevTools are automatically enabled in development. Access them via:
- Browser extension (if installed)
- Or use the Redux DevTools middleware

### Logging Middleware

Add logging middleware for debugging:

```typescript
const logger = (store: any) => (next: any) => (action: any) => {
  console.log('dispatching', action);
  let result = next(action);
  console.log('next state', store.getState());
  return result;
};
```

## Migration from Context API

### Before (Context API)

```typescript
const { user, login, logout } = useAuth();
```

### After (Redux)

```typescript
const { user, login, logout } = useAuthRedux();
// Or use selectors directly
const user = useAppSelector(selectAuthUser);
const dispatch = useAppDispatch();
```

The API remains similar for easy migration.
