'use client';

import { SiteManagerDashboard } from '@/components/pages/SiteManagerDashboard';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function SiteManagerDashboardRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <SiteManagerDashboard userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
