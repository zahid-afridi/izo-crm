# Redux Toolkit Migration Guide

This guide explains how to migrate from Context API to Redux Toolkit for state management.

## Phase 1: Auth Module (Current)

### What's Been Set Up

1. **Redux Store** (`src/store/store.ts`)
   - Configured with Redux Toolkit
   - Includes auth reducer
   - Ready for additional slices

2. **Auth Slice** (`src/store/slices/authSlice.ts`)
   - User state management
   - Async thunks: `checkAuth`, `login`, `logout`
   - Synchronous actions: `clearError`, `resetAuth`

3. **Auth Selectors** (`src/store/selectors/authSelectors.ts`)
   - Efficient state subscriptions
   - Prevents unnecessary re-renders

4. **Custom Hook** (`src/hooks/useAuthRedux.ts`)
   - Drop-in replacement for `useAuth`
   - Same API for easy migration

5. **Redux Provider** (`src/store/provider.tsx`)
   - Wraps the app with Redux store access

6. **API Service** (`src/services/api.ts`)
   - Centralized API calls
   - Consistent error handling
   - Foundation for caching

### Migration Steps for Auth

#### Step 1: Update Components Using `useAuth`

**Before:**
```typescript
import { useAuth } from '@/lib/auth-context';

export function MyComponent() {
  const { user, isLoading, login, logout } = useAuth();
  // ...
}
```

**After:**
```typescript
import { useAuthRedux } from '@/hooks/useAuthRedux';

export function MyComponent() {
  const { user, isLoading, login, logout } = useAuthRedux();
  // ...
}
```

#### Step 2: Update Protected Routes

**Before:**
```typescript
import { useAuth } from '@/lib/auth-context';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;

  return <Dashboard />;
}
```

**After:**
```typescript
import { useAppSelector } from '@/store/hooks';
import { selectAuthIsAuthenticated, selectAuthIsLoading } from '@/store/selectors/authSelectors';

export function ProtectedRoute() {
  const isAuthenticated = useAppSelector(selectAuthIsAuthenticated);
  const isLoading = useAppSelector(selectAuthIsLoading);

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Redirect to="/login" />;

  return <Dashboard />;
}
```

#### Step 3: Remove Old Context Provider

**Before:**
```typescript
// src/app/layout.tsx
import { AuthProvider } from '@/lib/auth-context';

export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
```

**After:**
```typescript
// src/app/layout.tsx
import { ReduxProvider } from '@/store/provider';

export default function RootLayout({ children }) {
  return (
    <ReduxProvider>
      {children}
    </ReduxProvider>
  );
}
```

## Phase 2: Additional Modules (Next Steps)

### Recommended Order

1. **Users/Workers Module**
   - Fetch users list
   - Cache user data
   - Reduce API calls

2. **Assignments Module**
   - Complex state with filters
   - Pagination
   - Real-time updates

3. **Orders Module**
   - Large dataset
   - Multiple filters
   - Status tracking

4. **Products/Services Module**
   - Catalog data
   - Caching opportunities
   - Search/filter state

### Template for New Slice

```typescript
// src/store/slices/[moduleName]Slice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGet, apiPost } from '@/services/api';

export interface [Module]State {
  items: Record<string, any>;
  allIds: string[];
  isLoading: boolean;
  error: string | null;
  filters: Record<string, any>;
}

const initialState: [Module]State = {
  items: {},
  allIds: [],
  isLoading: false,
  error: null,
  filters: {},
};

// Async thunks
export const fetch[Modules] = createAsyncThunk(
  '[module]/fetch[Modules]',
  async (params: any, { rejectWithValue }) => {
    try {
      const response = await apiGet('/api/[module]', { skipAuth: false });
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue('Failed to fetch [modules]');
    }
  }
);

const [module]Slice = createSlice({
  name: '[module]',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetch[Modules].pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetch[Modules].fulfilled, (state, action) => {
        state.isLoading = false;
        // Normalize data
        action.payload.forEach((item: any) => {
          state.items[item.id] = item;
          state.allIds.push(item.id);
        });
      })
      .addCase(fetch[Modules].rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters } = [module]Slice.actions;
export default [module]Slice.reducer;
```

## Performance Optimization Strategies

### 1. Request Deduplication

Prevent duplicate API calls when multiple components request the same data:

```typescript
let pendingRequest: Promise<any> | null = null;

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue, getState }) => {
    const state = getState() as RootState;
    
    // Return cached data if available and not stale
    if (state.users.allIds.length > 0 && !state.users.isStale) {
      return state.users;
    }

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

### 2. Normalized State

Store collections in normalized form to prevent duplication:

```typescript
// ❌ Avoid: Denormalized (duplicates data)
{
  users: [
    { id: 1, name: 'John', team: { id: 1, name: 'Team A' } },
    { id: 2, name: 'Jane', team: { id: 1, name: 'Team A' } },
  ]
}

// ✅ Good: Normalized
{
  users: {
    byId: {
      1: { id: 1, name: 'John', teamId: 1 },
      2: { id: 2, name: 'Jane', teamId: 1 },
    },
    allIds: [1, 2],
  },
  teams: {
    byId: {
      1: { id: 1, name: 'Team A' },
    },
    allIds: [1],
  }
}
```

### 3. Selector Memoization

Use selectors to prevent unnecessary re-renders:

```typescript
// ✅ Good: Only re-renders when user changes
const user = useAppSelector(selectAuthUser);

// ❌ Avoid: Re-renders on any state change
const user = useAppSelector((state) => state.auth.user);

// ✅ Good: Memoized derived selector
export const selectUsersByTeam = (teamId: string) =>
  createSelector(
    [(state: RootState) => state.users.byId],
    (usersById) =>
      Object.values(usersById).filter((user) => user.teamId === teamId)
  );
```

### 4. Pagination & Lazy Loading

Implement pagination to reduce initial data load:

```typescript
export interface PaginationState {
  items: Record<string, any>;
  allIds: string[];
  page: number;
  pageSize: number;
  total: number;
  isLoading: boolean;
}

export const fetchPaginatedUsers = createAsyncThunk(
  'users/fetchPaginated',
  async ({ page, pageSize }: { page: number; pageSize: number }, { rejectWithValue }) => {
    const response = await apiGet(
      `/api/users?page=${page}&pageSize=${pageSize}`
    );
    if (response.error) {
      return rejectWithValue(response.error);
    }
    return response.data;
  }
);
```

## API Call Reduction Checklist

- [ ] Implement request deduplication
- [ ] Add caching with stale-while-revalidate pattern
- [ ] Use pagination for large datasets
- [ ] Implement lazy loading for routes
- [ ] Add request debouncing for search/filter
- [ ] Use normalized state to prevent duplication
- [ ] Implement selector memoization
- [ ] Add background refresh for critical data
- [ ] Implement optimistic updates
- [ ] Add request batching for multiple operations

## Debugging Tips

### Redux DevTools

1. Install Redux DevTools browser extension
2. Open DevTools and navigate to Redux tab
3. See all dispatched actions and state changes
4. Time-travel debug by clicking on actions

### Logging Middleware

Add to `src/store/store.ts`:

```typescript
const logger = (store: any) => (next: any) => (action: any) => {
  console.group(action.type);
  console.info('dispatching', action);
  let result = next(action);
  console.log('next state', store.getState());
  console.groupEnd();
  return result;
};

export const store = configureStore({
  reducer: { /* ... */ },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(logger),
});
```

## Common Pitfalls

1. **Mutating state directly**: Redux requires immutable updates
   ```typescript
   // ❌ Wrong
   state.user.name = 'John';
   
   // ✅ Correct
   state.user = { ...state.user, name: 'John' };
   ```

2. **Not using selectors**: Causes unnecessary re-renders
   ```typescript
   // ❌ Wrong
   const user = useAppSelector((state) => state.auth.user);
   
   // ✅ Correct
   const user = useAppSelector(selectAuthUser);
   ```

3. **Async logic in reducers**: Use thunks instead
   ```typescript
   // ❌ Wrong
   reducers: {
     fetchUser: async (state) => { /* ... */ }
   }
   
   // ✅ Correct
   export const fetchUser = createAsyncThunk(/* ... */);
   ```

4. **Not handling all thunk states**: Always handle pending, fulfilled, rejected
   ```typescript
   // ✅ Complete
   builder
     .addCase(fetchUser.pending, (state) => { /* ... */ })
     .addCase(fetchUser.fulfilled, (state, action) => { /* ... */ })
     .addCase(fetchUser.rejected, (state, action) => { /* ... */ });
   ```

## Next Steps

1. Run `npm install` to install Redux dependencies
2. Test auth module with Redux
3. Gradually migrate other modules following the template
4. Monitor API calls and optimize as needed
5. Set up Redux DevTools for debugging
