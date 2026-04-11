import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  username: string;
  /** Matches Users.fullName from the database */
  fullName: string;
  email: string;
  role: string;
  /** Profile image URL (S3) */
  profile?: string | null;
}

/** Map `/api/auth/me` or `/api/auth/profile` user JSON to the session shape (no extra DB fields in Redux). */
export function userFromApiResponse(u: {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  profile?: string | null;
}): User {
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    role: String(u.role),
    profile: u.profile ?? null,
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

let pendingCheckAuthRequest: Promise<any> | null = null;

/**
 * Check authentication status on app load
 */
export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    if (pendingCheckAuthRequest) {
      return pendingCheckAuthRequest;
    }

    try {
      const request = fetch('/api/auth/me', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      pendingCheckAuthRequest = request;
      const response = await request;

      if (response.status === 404) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }).catch(() => {});

        pendingCheckAuthRequest = null;
        return rejectWithValue('User not found');
      }

      if (!response.ok) {
        pendingCheckAuthRequest = null;
        return rejectWithValue('Failed to verify authentication');
      }

      const data = await response.json();
      pendingCheckAuthRequest = null;
      return data.user;
    } catch (error) {
      pendingCheckAuthRequest = null;
      return rejectWithValue(
        error instanceof Error ? error.message : 'Authentication check failed'
      );
    }
  }
);

/**
 * User login
 */
export const login = createAsyncThunk(
  'auth/login',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let code = 'LOGIN_FAILED';
        try {
          const body = await response.json();
          if (body?.error && typeof body.error === 'string') code = body.error;
        } catch {
          /* ignore */
        }
        return rejectWithValue(code);
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'LOGIN_FAILED'
      );
    }
  }
);

/**
 * User logout
 */
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Clear pending request so checkAuth can be called again
      pendingCheckAuthRequest = null;

      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      }).catch(() => {});

      return null;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Logout failed'
      );
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    /** Apply server user payload without calling `/api/auth/me` (e.g. after profile PATCH). */
    setSessionUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(login.pending, (state) => {
        // Do not set isLoading — login page uses local button state; global isLoading would swap the form for "Checking authentication..."
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      .addCase(logout.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setSessionUser } = authSlice.actions;
export default authSlice.reducer;
