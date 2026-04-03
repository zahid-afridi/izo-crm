'use client';

import { SettingsPage } from '@/components/pages/SettingsPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function SettingsRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <SettingsPage userRole={user?.role || 'admin'} />
    </AuthenticatedLayout>
  );
}
