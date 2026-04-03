'use client';

import { WorkerDashboard } from '@/components/pages/WorkerDashboard';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function WorkerDashboardRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <WorkerDashboard userRole={user?.role || 'worker'} />
    </AuthenticatedLayout>
  );
}
