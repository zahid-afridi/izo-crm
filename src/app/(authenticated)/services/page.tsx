'use client';

import { ServicesPage } from '@/components/pages/ServicesPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function ServicesRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <ServicesPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
