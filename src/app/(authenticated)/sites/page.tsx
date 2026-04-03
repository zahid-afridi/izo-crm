'use client';

import { SitesPage } from '@/components/pages/SitesPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function SitesRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <SitesPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
