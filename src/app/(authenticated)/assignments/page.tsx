'use client';

import { AssignmentsPage } from '@/components/pages/AssignmentsPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function AssignmentsRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <AssignmentsPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
