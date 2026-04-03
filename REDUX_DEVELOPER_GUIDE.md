# Redux Developer Guide - Getting Started

A practical guide for developers to start using Redux in this project.

## Prerequisites

- Node.js 18+
- npm or yarn
- Basic understanding of React hooks
- Familiarity with async/await

## Installation

```bash
# Install all dependencies including Redux
npm install

# Verify Redux is installed
npm list @reduxjs/toolkit react-redux redux
```

## Project Structure

```
src/
├── store/                          # Redux store
│   ├── store.ts                   # Store configuration
│   ├── hooks.ts                   # Pre-typed hooks
│   ├── provider.tsx               # Redux Provider
│   ├── slices/
│   │   └── authSlice.ts           # Auth state management
│   └── selectors/
│       └── authSelectors.ts       # Auth selectors
├── services/
│   └── api.ts                     # Centralized API calls
├── hooks/
│   └── useAuthRedux.ts            # Custom auth hook
└── app/
    └── layout.tsx                 # Root layout with Redux
```

## Your First Redux Component

### Step 1: Create a Simple Component

```typescript
// src/components/UserProfile.tsx
'use client';

import { useAuthRedux } from '@/hooks/useAuthRedux';

export function UserProfile() {
  const { user, isLoading } = useAuthRedux();

  if (isLoading) return <div>Loading...</div>;
  if (!user) return <div>Not logged in</div>;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}
```

### Step 2: Use It in Your App

```typescript
import { UserProfile } from '@/components/UserProfile';

export default function Page() {
  return (
    <div>
      <UserProfile />
    </div>
  );
}
```

## Common Tasks

### Task 1: Access User Data

```typescript
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export function MyComponent() {
  const user = useAppSelector(selectAuthUser);

  return <div>{user?.name}</div>;
}
```

### Task 2: Check if User is Logged In

```typescript
import { useAppSelector } from '@/store/hooks';
import { selectAuthIsAuthenticated } from '@/store/selectors/authSelectors';

export function MyComponent() {
  const isAuthenticated = useAppSelector(selectAuthIsAuthenticated);

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return <div>You are logged in</div>;
}
```

### Task 3: Handle Login

```typescript
import { useAppDispatch } from '@/store/hooks';
import { login } from '@/store/slices/authSlice';

export function LoginForm() {
  const dispatch = useAppDispatch();

  const handleSubmit = async (email: string, password: string) => {
    const result = await dispatch(login({ email, password }));

    if (login.fulfilled.match(result)) {
      console.log('Login successful');
      // Redirect happens automatically in useAuthRedux
    } else {
      console.log('Login failed');
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      handleSubmit(
        formData.get('email') as string,
        formData.get('password') as string
      );
    }}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit">Login</button>
    </form>
  );
}
```

### Task 4: Handle Logout

```typescript
import { useAuthRedux } from '@/hooks/useAuthRedux';

export function LogoutButton() {
  const { logout } = useAuthRedux();

  return (
    <button onClick={logout}>
      Logout
    </button>
  );
}
```

### Task 5: Show Loading State

```typescript
import { useAppSelector } from '@/store/hooks';
import { selectAuthIsLoading } from '@/store/selectors/authSelectors';

export function MyComponent() {
  const isLoading = useAppSelector(selectAuthIsLoading);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <div>Content loaded</div>;
}
```

### Task 6: Show Error Messages

```typescript
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectAuthError } from '@/store/selectors/authSelectors';
import { clearError } from '@/store/slices/authSlice';

export function ErrorDisplay() {
  const dispatch = useAppDispatch();
  const error = useAppSelector(selectAuthError);

  if (!error) return null;

  return (
    <div className="error">
      <p>{error}</p>
      <button onClick={() => dispatch(clearError())}>
        Dismiss
      </button>
    </div>
  );
}
```

## Making API Calls

### Using the API Service

```typescript
import { apiGet, apiPost } from '@/services/api';

// GET request
const response = await apiGet('/api/users');
if (response.error) {
  console.error('Error:', response.error);
} else {
  console.log('Users:', response.data);
}

// POST request
const response = await apiPost('/api/users', {
  name: 'John',
  email: 'john@example.com'
});
```

### In Redux Thunks

```typescript
import { createAsyncThunk } from '@reduxjs/toolkit';
import { apiGet } from '@/services/api';

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

## Debugging

### Using Redux DevTools

1. Install [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools-extension)
2. Open your browser DevTools
3. Go to the "Redux" tab
4. See all actions and state changes
5. Click on actions to see what changed
6. Use time-travel debugging to go back/forward

### Console Logging

```typescript
// In components
const state = useAppSelector((state) => state);
console.log('Redux state:', state);

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

## Common Patterns

### Pattern 1: Conditional Rendering

```typescript
const user = useAppSelector(selectAuthUser);
const isLoading = useAppSelector(selectAuthIsLoading);
const error = useAppSelector(selectAuthError);

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
if (!user) return <LoginForm />;

return <Dashboard />;
```

### Pattern 2: Form Submission

```typescript
const dispatch = useAppDispatch();
const isLoading = useAppSelector(selectAuthIsLoading);

const handleSubmit = async (formData: FormData) => {
  const result = await dispatch(login({
    email: formData.get('email') as string,
    password: formData.get('password') as string
  }));

  if (login.fulfilled.match(result)) {
    // Success
  } else if (login.rejected.match(result)) {
    // Error
  }
};
```

### Pattern 3: Conditional Dispatch

```typescript
const user = useAppSelector(selectAuthUser);
const dispatch = useAppDispatch();

useEffect(() => {
  if (!user) {
    dispatch(checkAuth());
  }
}, [user, dispatch]);
```

## Best Practices

### ✅ DO

```typescript
// Use selectors
const user = useAppSelector(selectAuthUser);

// Use pre-typed hooks
const dispatch = useAppDispatch();

// Handle all thunk states
if (login.fulfilled.match(result)) { /* ... */ }
if (login.rejected.match(result)) { /* ... */ }

// Use async thunks for API calls
export const fetchUsers = createAsyncThunk(/* ... */);

// Normalize state for collections
{ byId: { 1: {...}, 2: {...} }, allIds: [1, 2] }
```

### ❌ DON'T

```typescript
// Don't access state directly
const user = useAppSelector((state) => state.auth.user);

// Don't use plain hooks
const dispatch = useDispatch();

// Don't ignore thunk states
const result = await dispatch(login(/* ... */));

// Don't make API calls in reducers
reducers: {
  fetchUser: async (state) => { /* ... */ }
}

// Don't denormalize state
{ users: [{ id: 1, team: { id: 1, name: 'Team A' } }] }
```

## Troubleshooting

### Issue: "useAuth must be used within an AuthProvider"

**Solution:** Use `useAuthRedux` instead of `useAuth`

```typescript
// ❌ Wrong
import { useAuth } from '@/lib/auth-context';

// ✅ Correct
import { useAuthRedux } from '@/hooks/useAuthRedux';
```

### Issue: Component not re-rendering when state changes

**Solution:** Use selectors instead of direct state access

```typescript
// ❌ Wrong
const { user } = useAppSelector((state) => state.auth);

// ✅ Correct
const user = useAppSelector(selectAuthUser);
```

### Issue: "Cannot read property 'user' of undefined"

**Solution:** Check if state is loaded

```typescript
const user = useAppSelector(selectAuthUser);

if (!user) return <LoadingSpinner />;
return <div>{user.name}</div>;
```

### Issue: Infinite loops or too many renders

**Solution:** Add dependencies to useEffect

```typescript
// ❌ Wrong
useEffect(() => {
  dispatch(fetchUsers());
});

// ✅ Correct
useEffect(() => {
  dispatch(fetchUsers());
}, [dispatch]);
```

## Next Steps

1. **Understand the basics** - Read this guide
2. **Try the examples** - Copy and modify the code samples
3. **Explore Redux DevTools** - See how state changes
4. **Read the docs** - Check `src/store/README.md`
5. **Migrate components** - Start with auth module
6. **Create new slices** - Follow the template
7. **Optimize** - Implement caching and deduplication

## Resources

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Redux Documentation](https://redux.js.org/)
- [React-Redux Documentation](https://react-redux.js.org/)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools-extension)
- [Redux Style Guide](https://redux.js.org/style-guide/style-guide)

## Getting Help

1. Check the documentation files:
   - `src/store/README.md` - Architecture guide
   - `REDUX_MIGRATION_GUIDE.md` - Migration instructions
   - `REDUX_QUICK_REFERENCE.md` - Quick lookup

2. Use Redux DevTools to debug

3. Check the examples in this guide

4. Review existing code in `src/store/slices/authSlice.ts`

## Tips for Success

1. **Start small** - Begin with auth module
2. **Use selectors** - Always use selectors for state access
3. **Test thoroughly** - Test each component after migration
4. **Monitor performance** - Use Redux DevTools to track improvements
5. **Ask questions** - Don't hesitate to ask for help
6. **Document patterns** - Share what you learn with the team
7. **Celebrate wins** - Track API call reduction and performance gains

---

**Happy coding! 🚀**

For questions or issues, refer to the documentation or Redux DevTools.
