'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login, logout } from '@/store/slices/authSlice';
import {
  selectAuthUser,
  selectAuthIsAuthenticated,
  selectAuthIsLoading,
  selectAuthError,
} from '@/store/selectors/authSelectors';

export function useAuthRedux() {
  const dispatch = useAppDispatch();

  const user = useAppSelector(selectAuthUser);
  const isAuthenticated = useAppSelector(selectAuthIsAuthenticated);
  const isLoading = useAppSelector(selectAuthIsLoading);
  const error = useAppSelector(selectAuthError);

  const handleLogin = async (email: string, password: string) => {
    const result = await dispatch(login({ email, password }));

    if (login.fulfilled.match(result)) {
      const role = result.payload.role.toLowerCase();
      const roleRedirects: Record<string, string> = {
        admin: '/dashboard',
        worker: '/workers',
        product_manager: '/products',
        site_manager: '/assignments',
        offer_manager: '/offers',
        sales_agent: '/orders',
        order_manager: '/orders',
        office_employee: '/orders',
        website_manager: '/website-manager',
      };

      window.location.href = roleRedirects[role] || '/dashboard';
    }
  };

  const handleLogout = async () => {
    await dispatch(logout());
    window.location.href = '/auth/login';
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    logout: handleLogout,
  };
}
