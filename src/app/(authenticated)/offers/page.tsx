'use client';

import { OffersPage } from '@/components/pages/OffersPage_Enhanced';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function OffersRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <OffersPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
