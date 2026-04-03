'use client';

import { WorkerLocationTracking } from '@/components/pages/WorkerLocationTracking';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function WorkerLocationTrackingRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <WorkerLocationTracking userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
