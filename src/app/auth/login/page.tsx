'use client';

import { LoginPage } from '@/components/auth/LoginPage';
import { useAuthRedux } from '@/hooks/useAuthRedux';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from 'lucide-react';

export default function LoginRoute() {
  const { login, isAuthenticated, isLoading, user } = useAuthRedux();
  const router = useRouter();

  // Redirect authenticated users
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const role = user.role.toLowerCase();

      // Role-specific redirects
      const roleRedirects: Record<string, string> = {
        admin: '/dashboard',
        worker: '/workers',
        product_manager: '/products',
        site_manager: '/assignments',
        offer_manager: '/offers',
        sales_agent: '/orders',
        order_manager: '/orders',
        office_employee: '/orders',
        website_manager: '/website-manager'
      };

      const redirectPath = roleRedirects[role] || '/dashboard';
      router.replace(redirectPath);
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader className="w-5 h-5 animate-spin" />
          <span>Checking authentication...</span>
        </div>
      </div>
    );
  }

  // Don't render login form if user is authenticated
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader className="w-5 h-5 animate-spin" />
          <span>Redirecting...</span>
        </div>
      </div>
    );
  }

  return <LoginPage onLogin={login} />;
}
