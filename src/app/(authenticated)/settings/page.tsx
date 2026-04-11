'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { SettingsPage } from '@/components/pages/SettingsPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser, selectAuthIsLoading } from '@/store/selectors/authSelectors';

export default function SettingsRoute() {
  const user = useAppSelector(selectAuthUser);
  const authLoading = useAppSelector(selectAuthIsLoading);
  const router = useRouter();
  const { t } = useTranslation();
  const role = user?.role?.toLowerCase();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login');
      return;
    }
    if (role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, role, router]);

  if (authLoading) {
    return (
      <AuthenticatedLayout>
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
          {t('auth.checkingSession')}
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!user || role !== 'admin') {
    return null;
  }

  return (
    <AuthenticatedLayout>
      <SettingsPage />
    </AuthenticatedLayout>
  );
}
