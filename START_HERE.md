# Redux Migration - START HERE 🚀

Welcome! The application has been migrated from Context API to Redux Toolkit. Here's what you need to know.

## ⚡ Quick Start (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Application
```bash
npm run dev
```

### 3. Test Login
- Go to http://localhost:3000
- Login with: `admin@gmail.com` / `password`
- You should see the dashboard

## 📚 Documentation

### For Developers
1. **First Time?** → Read `REDUX_DEVELOPER_GUIDE.md`
2. **Need Quick Lookup?** → Check `REDUX_QUICK_REFERENCE.md`
3. **Deep Dive?** → Read `src/store/README.md`

### For Project Managers
1. **What Changed?** → Read `REDUX_MIGRATION_COMPLETE.md`
2. **What's Next?** → Check `REDUX_IMPLEMENTATION_CHECKLIST.md`
3. **Deployment?** → Use `REDUX_DEPLOYMENT_CHECKLIST.md`

### For DevOps/QA
1. **Testing Guide** → `REDUX_DEPLOYMENT_CHECKLIST.md`
2. **Rollback Plan** → See deployment checklist
3. **Monitoring** → Redux DevTools + error logs

## 🎯 What Changed

### Before (Context API)
```typescript
import { useAuth } from '@/lib/auth-context';

export function MyComponent() {
  const { user, login, logout } = useAuth();
  // ...
}
```

### After (Redux)
```typescript
// Option 1: Custom Hook
import { useAuthRedux } from '@/hooks/useAuthRedux';

export function MyComponent() {
  const { user, login, logout } = useAuthRedux();
  // ...
}

// Option 2: Redux Selectors (Recommended)
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export function MyComponent() {
  const user = useAppSelector(selectAuthUser);
  // ...
}
```

## 🔍 Key Files

### Redux Store
- `src/store/store.ts` - Store configuration
- `src/store/hooks.ts` - Pre-typed hooks
- `src/store/provider.tsx` - Redux Provider
- `src/store/slices/authSlice.ts` - Auth state
- `src/store/selectors/authSelectors.ts` - Auth selectors

### API Service
- `src/services/api.ts` - Centralized API calls

### Custom Hooks
- `src/hooks/useAuthRedux.ts` - Auth hook
- `src/hooks/useRouteProtection.ts` - Route protection

## 🧪 Testing

### Manual Testing
1. Login with valid credentials
2. Verify dashboard loads
3. Refresh page - user should still be logged in
4. Logout - should redirect to login
5. Try accessing protected route without login - should redirect

### Redux DevTools
1. Install [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools-extension)
2. Open DevTools → Redux tab
3. See all actions and state changes
4. Click actions to time-travel debug

## 🚀 Common Tasks

### Access User Data
```typescript
const user = useAppSelector(selectAuthUser);
console.log(user?.name, user?.email, user?.role);
```

### Check if Logged In
```typescript
const isAuthenticated = useAppSelector(selectAuthIsAuthenticated);
if (!isAuthenticated) {
  return <LoginForm />;
}
```

### Handle Login
```typescript
const { login } = useAuthRedux();
await login(email, password);
```

### Handle Logout
```typescript
const { logout } = useAuthRedux();
await logout();
```

### Show Loading State
```typescript
const isLoading = useAppSelector(selectAuthIsLoading);
if (isLoading) return <LoadingSpinner />;
```

### Show Error Message
```typescript
const error = useAppSelector(selectAuthError);
if (error) return <ErrorMessage message={error} />;
```

## ⚠️ Common Mistakes

### ❌ Don't
```typescript
// Wrong: Direct state access
const user = useAppSelector((state) => state.auth.user);

// Wrong: Using old context
import { useAuth } from '@/lib/auth-context';

// Wrong: Mutating state
state.user.name = 'John';

// Wrong: Async logic in reducers
reducers: {
  fetchUser: async (state) => { /* ... */ }
}
```

### ✅ Do
```typescript
// Correct: Use selectors
const user = useAppSelector(selectAuthUser);

// Correct: Use Redux hooks
import { useAuthRedux } from '@/hooks/useAuthRedux';

// Correct: Immutable updates
state.user = { ...state.user, name: 'John' };

// Correct: Use async thunks
export const fetchUser = createAsyncThunk(/* ... */);
```

## 🐛 Troubleshooting

### Issue: "useAuth must be used within an AuthProvider"
**Solution:** Use `useAuthRedux` or Redux selectors instead

### Issue: User not persisting on refresh
**Solution:** This is normal. The `checkAuth` thunk verifies session on app load

### Issue: Components not re-rendering
**Solution:** Use selectors instead of direct state access

### Issue: Redux DevTools not showing
**Solution:** Install the browser extension and refresh

## 📞 Getting Help

1. **Quick Question?** → Check `REDUX_QUICK_REFERENCE.md`
2. **How to Use?** → Read `REDUX_DEVELOPER_GUIDE.md`
3. **Architecture?** → See `src/store/README.md`
4. **Debugging?** → Use Redux DevTools
5. **Still Stuck?** → Ask the team lead

## 🎓 Learning Path

### Day 1: Basics
- [ ] Read `REDUX_DEVELOPER_GUIDE.md`
- [ ] Try the examples
- [ ] Login and explore Redux DevTools

### Day 2: Implementation
- [ ] Create a simple component using Redux
- [ ] Use selectors instead of direct state access
- [ ] Debug with Redux DevTools

### Day 3: Advanced
- [ ] Read `src/store/README.md`
- [ ] Understand async thunks
- [ ] Learn about selectors and memoization

## 📊 Project Status

✅ **Phase 1: Auth Module - COMPLETE**
- Redux setup done
- All components migrated
- Ready for testing

⏳ **Phase 2: Additional Modules - PLANNED**
- Users/Workers module
- Assignments module
- Orders module
- Products/Services module

## 🎯 Next Steps

1. **Install:** `npm install`
2. **Test:** Run the app and verify login works
3. **Review:** Check the documentation
4. **Deploy:** Follow deployment checklist
5. **Monitor:** Use Redux DevTools to track state

## 📋 Checklist

- [ ] Installed dependencies (`npm install`)
- [ ] App runs without errors (`npm run dev`)
- [ ] Can login successfully
- [ ] Dashboard loads after login
- [ ] Redux DevTools shows auth actions
- [ ] Can logout successfully
- [ ] Read `REDUX_DEVELOPER_GUIDE.md`
- [ ] Understand Redux basics
- [ ] Ready to work with Redux

## 🎉 You're Ready!

The Redux migration is complete and the app is ready to use. Start with the quick start above, then explore the documentation as needed.

**Happy coding! 🚀**

---

## Quick Links

- 📖 [Developer Guide](REDUX_DEVELOPER_GUIDE.md)
- 🔍 [Quick Reference](REDUX_QUICK_REFERENCE.md)
- 🏗️ [Architecture](src/store/README.md)
- ✅ [Migration Complete](REDUX_MIGRATION_COMPLETE.md)
- 📋 [Deployment Checklist](REDUX_DEPLOYMENT_CHECKLIST.md)
- 🎯 [Final Summary](REDUX_FINAL_SUMMARY.md)

---

**Last Updated:** April 2, 2026
**Status:** ✅ Ready for Use
