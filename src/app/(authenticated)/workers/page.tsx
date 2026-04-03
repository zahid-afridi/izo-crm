'use client';

import { WorkersPage } from '@/components/pages/WorkersPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';
import { WorkerProfilePage } from '@/components/pages/WorkerProfilePage';

export default function WorkersRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      {user?.role === 'worker' ? (
        <WorkerProfilePage />
      ) : (
        <WorkersPage userRole={user?.role || ''} />
      )}
    </AuthenticatedLayout>
  );
}
