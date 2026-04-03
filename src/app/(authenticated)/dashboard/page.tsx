'use client';

import { Dashboard } from '@/components/Dashboard';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function DashboardPage() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <Dashboard userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
