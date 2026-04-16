'use client';

import { LoginPage } from '@/components/auth/LoginPage';
import { useAuthRedux } from '@/hooks/useAuthRedux';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LoginRoute() {
  const { t } = useTranslation();
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
        site_manager: '/sites',
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

  // Initial session check only (checkAuth) — not login submit; login uses button spinner on LoginPage
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-700">
          <Loader className="w-5 h-5 animate-spin shrink-0" aria-hidden />
          <span>{t('auth.checkingSession')}</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-700">
          <Loader className="w-5 h-5 animate-spin shrink-0" aria-hidden />
          <span>{t('auth.redirecting')}</span>
        </div>
      </div>
    );
  }

  return <LoginPage onLogin={login} />;
}
