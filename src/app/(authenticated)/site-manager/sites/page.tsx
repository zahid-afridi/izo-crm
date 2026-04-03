'use client';

import { SitesManagement } from '@/components/pages/SitesManagement';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function SitesManagementRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <SitesManagement userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
