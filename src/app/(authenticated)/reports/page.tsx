'use client';

import { ReportsPage } from '@/components/pages/ReportsPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function ReportsRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <ReportsPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
