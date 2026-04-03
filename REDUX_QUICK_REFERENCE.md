# Redux Quick Reference Guide

Quick lookup for common Redux patterns and usage.

## Installation

```bash
npm install
```

## Basic Setup (Already Done)

Redux is already configured in:
- `src/store/store.ts` - Store configuration
- `src/store/provider.tsx` - Wrapped in `src/app/layout.tsx`

## Using Redux in Components

### Option 1: Using Custom Hook (Recommended for Auth)

```typescript
'use client';

import { useAuthRedux } from '@/hooks/useAuthRedux';

export function MyComponent() {
  const { user, isLoading, error, login, logout } = useAuthRedux();

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {user && <p>Welcome, {user.name}</p>}
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### Option 2: Using Selectors (Recommended for Performance)

```typescript
'use client';

import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectAuthUser, selectAuthIsLoading } from '@/store/selectors/authSelectors';
import { login } from '@/store/slices/authSlice';

export function MyComponent() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const isLoading = useAppSelector(selectAuthIsLoading);

  const handleLogin = async (email: string, password: string) => {
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      console.log('Login successful');
    }
  };

  return (
    <div>
      {isLoading && <p>Loading...</p>}
      {user && <p>Welcome, {user.name}</p>}
    </div>
  );
}
```

## Common Patterns

### Accessing State

```typescript
// ✅ Good: Using selector
const user = useAppSelector(selectAuthUser);

// ❌ Avoid: Direct state access
const user = useAppSelector((state) => state.auth.user);
```

### Dispatching Actions

```typescript
const dispatch = useAppDispatch();

// Async thunk
const result = await dispatch(login({ email, password }));

// Synchronous action
dispatch(clearError());
```

### Handling Async Results

```typescript
const result = await dispatch(login({ email, password }));

if (login.fulfilled.match(result)) {
  // Success
  console.log('User:', result.payload);
} else if (login.rejected.match(result)) {
  // Error
  console.log('Error:', result.payload);
}
```

### Conditional Rendering Based on State

```typescript
const isLoading = useAppSelector(selectAuthIsLoading);
const error = useAppSelector(selectAuthError);
const user = useAppSelector(selectAuthUser);

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
if (!user) return <LoginForm />;

return <Dashboard />;
```

## Auth Module API

### Hooks

```typescript
import { useAuthRedux } from '@/hooks/useAuthRedux';

const {
  user,              // Current user object
  isAuthenticated,   // Boolean
  isLoading,         // Boolean
  error,             // Error message or null
  login,             // Function: (email, password) => Promise
  logout,            // Function: () => Promise
  clearError,        // Function: () => void
} = useAuthRedux();
```

### Selectors

```typescript
import { useAppSelector } from '@/store/hooks';
import {
  selectAuthUser,
  selectAuthIsAuthenticated,
  selectAuthIsLoading,
  selectAuthError,
  selectAuthToken,
  selectAuthUserRole,
  selectAuthUserId,
  selectAuthUserEmail,
} from '@/store/selectors/authSelectors';

const user = useAppSelector(selectAuthUser);
const isAuth = useAppSelector(selectAuthIsAuthenticated);
const isLoading = useAppSelector(selectAuthIsLoading);
const error = useAppSelector(selectAuthError);
const token = useAppSelector(selectAuthToken);
const role = useAppSelector(selectAuthUserRole);
const userId = useAppSelector(selectAuthUserId);
const email = useAppSelector(selectAuthUserEmail);
```

### Async Thunks

```typescript
import { useAppDispatch } from '@/store/hooks';
import { checkAuth, login, logout } from '@/store/slices/authSlice';

const dispatch = useAppDispatch();

// Check authentication on app load
await dispatch(checkAuth());

// Login
const result = await dispatch(login({ email, password }));

// Logout
await dispatch(logout(userId));
```

### Synchronous Actions

```typescript
import { clearError, resetAuth } from '@/store/slices/authSlice';

dispatch(clearError());  // Clear error message
dispatch(resetAuth());   // Reset auth state
```

## API Service

### Making API Calls

```typescript
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/services/api';

// GET
const response = await apiGet('/api/users');
if (response.error) {
  console.error(response.error);
} else {
  console.log(response.data);
}

// POST
const response = await apiPost('/api/users', { name: 'John' });

// PUT
const response = await apiPut('/api/users/1', { name: 'Jane' });

// PATCH
const response = await apiPatch('/api/users/1', { status: 'active' });

// DELETE
const response = await apiDelete('/api/users/1');
```

## Creating New Slices

### Template

```typescript
// src/store/slices/usersSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGet } from '@/services/api';

export interface UsersState {
  items: Record<string, any>;
  allIds: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  items: {},
  allIds: [],
  isLoading: false,
  error: null,
};

// Async thunk
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

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        action.payload.forEach((user: any) => {
          state.items[user.id] = user;
          state.allIds.push(user.id);
        });
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;
```

### Add to Store

```typescript
// src/store/store.ts
import usersReducer from './slices/usersSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    users: usersReducer,  // Add here
  },
});
```

### Create Selectors

```typescript
// src/store/selectors/usersSelectors.ts
import { RootState } from '../store';

export const selectAllUsers = (state: RootState) =>
  state.users.allIds.map(id => state.users.items[id]);

export const selectUserById = (id: string) => (state: RootState) =>
  state.users.items[id];

export const selectUsersLoading = (state: RootState) =>
  state.users.isLoading;

export const selectUsersError = (state: RootState) =>
  state.users.error;
```

## Debugging

### Redux DevTools

1. Install browser extension: [Redux DevTools](https://github.com/reduxjs/redux-devtools-extension)
2. Open DevTools → Redux tab
3. See all actions and state changes
4. Click actions to time-travel debug

### Console Logging

```typescript
// In components
const state = useAppSelector((state) => state);
console.log('Current state:', state);

// In thunks
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { rejectWithValue, getState }) => {
    const state = getState();
    console.log('Current state:', state);
    // ...
  }
);
```

## Performance Tips

### 1. Use Selectors

```typescript
// ✅ Good: Only re-renders when user changes
const user = useAppSelector(selectAuthUser);

// ❌ Bad: Re-renders on any state change
const { user } = useAppSelector((state) => state.auth);
```

### 2. Memoize Derived Data

```typescript
import { createSelector } from '@reduxjs/toolkit';

export const selectUsersByRole = (role: string) =>
  createSelector(
    [(state: RootState) => state.users.items],
    (items) => Object.values(items).filter(u => u.role === role)
  );
```

### 3. Normalize State

```typescript
// ❌ Bad: Denormalized
{ users: [{ id: 1, name: 'John', team: { id: 1, name: 'Team A' } }] }

// ✅ Good: Normalized
{
  users: { byId: { 1: { id: 1, name: 'John', teamId: 1 } }, allIds: [1] },
  teams: { byId: { 1: { id: 1, name: 'Team A' } }, allIds: [1] }
}
```

## Common Errors

### Error: "useAuth must be used within an AuthProvider"

**Solution:** Use `useAuthRedux` instead of `useAuth`

```typescript
// ❌ Wrong
import { useAuth } from '@/lib/auth-context';

// ✅ Correct
import { useAuthRedux } from '@/hooks/useAuthRedux';
```

### Error: "Cannot read property 'user' of undefined"

**Solution:** Check if state is loaded before accessing

```typescript
const user = useAppSelector(selectAuthUser);

if (!user) return <LoadingSpinner />;
return <div>{user.name}</div>;
```

### Error: "Mutating state directly"

**Solution:** Use immutable updates

```typescript
// ❌ Wrong
state.user.name = 'John';

// ✅ Correct
state.user = { ...state.user, name: 'John' };
```

## Useful Links

- [Redux Toolkit Docs](https://redux-toolkit.js.org/)
- [Redux Docs](https://redux.js.org/)
- [React-Redux Docs](https://react-redux.js.org/)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools-extension)

## Next Steps

1. ✅ Redux setup complete
2. ⏳ Migrate auth components to use `useAuthRedux`
3. ⏳ Create users slice
4. ⏳ Create assignments slice
5. ⏳ Create orders slice
6. ⏳ Implement caching strategies
7. ⏳ Monitor API call reduction

---

**Last Updated:** April 2, 2026
**Status:** Auth module ready for migration
