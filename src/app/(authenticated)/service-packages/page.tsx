'use client';

import { ServicePackagesPage } from '@/components/pages/ServicePackagesPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function ServicePackagesRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <ServicePackagesPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
