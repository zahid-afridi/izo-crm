# Redux Login/Logout White Screen Fix

## Problem

After logout and login, the page displayed a white screen instead of loading the dashboard.

## Root Cause

The issue was in the auth initialization logic:

1. **sessionStorage guard prevented re-check** - After first app load, `auth-checked` was set to `true`
2. **Logout didn't clear the flag** - sessionStorage persisted across logout
3. **Login didn't trigger checkAuth** - After login redirect, checkAuth wasn't called again
4. **Pending request wasn't cleared** - The pending request tracker wasn't reset on logout

**Result:** After logout/login, the app thought auth was already checked and didn't verify the new session.

## Solution

### 1. Removed sessionStorage Guard ✅
**File:** `src/store/provider.tsx`

**Before:**
```typescript
useEffect(() => {
  const hasCheckedAuth = sessionStorage.getItem('auth-checked');
  if (!hasCheckedAuth) {
    dispatch(checkAuth());
    sessionStorage.setItem('auth-checked', 'true');
  }
}, [dispatch]);
```

**After:**
```typescript
useEffect(() => {
  // Always check auth on mount to ensure fresh state
  dispatch(checkAuth());
}, [dispatch]);
```

**Benefits:**
- ✅ checkAuth called every time AuthInitializer mounts
- ✅ Works correctly after logout/login
- ✅ Ensures fresh auth state
- ✅ Request deduplication still works (in authSlice)

### 2. Clear Pending Request on Logout ✅
**File:** `src/store/slices/authSlice.ts`

**Before:**
```typescript
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await fetch('/api/auth/logout', {...}).catch(() => {});
      return null;
    } catch (error) {
      return rejectWithValue(...);
    }
  }
);
```

**After:**
```typescript
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Clear pending request so checkAuth can be called again
      pendingCheckAuthRequest = null;

      await fetch('/api/auth/logout', {...}).catch(() => {});
      return null;
    } catch (error) {
      return rejectWithValue(...);
    }
  }
);
```

**Benefits:**
- ✅ Pending request cleared on logout
- ✅ checkAuth can be called again after login
- ✅ No stale pending requests
- ✅ Fresh auth check on new session

## How It Works Now

### Flow After Logout/Login

1. **User clicks logout**
   - `logout` thunk clears `pendingCheckAuthRequest`
   - User redirected to login page

2. **User logs in**
   - `login` thunk authenticates user
   - User redirected to dashboard
   - Page component mounts

3. **AuthInitializer runs**
   - `checkAuth` is called (no sessionStorage guard)
   - Verifies new session with `/api/auth/me`
   - Updates Redux state with new user data

4. **Dashboard renders**
   - Auth state is fresh and correct
   - User data displays properly
   - No white screen

## Performance Impact

### Request Deduplication Still Works

The request deduplication in `checkAuth` still prevents duplicate simultaneous requests:

```typescript
if (pendingCheckAuthRequest) {
  return pendingCheckAuthRequest;  // Return cached pending request
}
```

**Result:**
- ✅ Multiple components can call checkAuth
- ✅ Only one actual API request is made
- ✅ All components get the same result
- ✅ No duplicate API calls

### API Calls

**Scenario: Logout and Login**

1. Initial app load: 1 API call (checkAuth)
2. Logout: 1 API call (logout endpoint)
3. Login: 1 API call (login endpoint)
4. After login redirect: 1 API call (checkAuth)
5. **Total: 4 API calls** ✅

**Before fix:** Would hang on step 4 (white screen)

## Testing

### Test Case 1: Initial Load
1. ✅ App loads
2. ✅ checkAuth called
3. ✅ Dashboard displays

### Test Case 2: Logout
1. ✅ Click logout
2. ✅ Redirected to login
3. ✅ Auth state cleared

### Test Case 3: Login After Logout
1. ✅ Enter credentials
2. ✅ Click login
3. ✅ Redirected to dashboard
4. ✅ Dashboard displays (no white screen)
5. ✅ User data shows correctly

### Test Case 4: Multiple Logins
1. ✅ Login as user A
2. ✅ Logout
3. ✅ Login as user B
4. ✅ Dashboard shows user B data
5. ✅ No stale data from user A

## Files Modified

1. **src/store/provider.tsx**
   - Removed sessionStorage guard
   - Always call checkAuth on mount

2. **src/store/slices/authSlice.ts**
   - Clear pending request on logout
   - Ensures fresh auth check after login

## Backward Compatibility

✅ **No breaking changes**
- All component APIs unchanged
- All features working
- Same behavior for normal usage
- Only fixes logout/login flow

## Conclusion

The white screen issue after logout/login has been fixed by:
1. Removing the sessionStorage guard
2. Clearing pending requests on logout
3. Ensuring fresh auth check after login

The app now correctly handles logout/login cycles while maintaining request deduplication for performance.

---

**Fix Date:** April 2, 2026
**Status:** ✅ Fixed and Tested
**Issue:** White screen after logout/login
**Solution:** Remove sessionStorage guard + clear pending requests
**Result:** Logout/login works correctly
