'use client';

import { ActivityLogPage } from '@/components/pages/ActivityLogPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function ActivityLogRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <ActivityLogPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
