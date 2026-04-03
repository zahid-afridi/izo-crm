'use client';

import { WorkersManagement } from '@/components/pages/WorkersManagement';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function WorkersManagementRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <WorkersManagement userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
