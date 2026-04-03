'use client';

import { CarsManagement } from '@/components/pages/CarsManagement';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function CarsManagementRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <CarsManagement userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
