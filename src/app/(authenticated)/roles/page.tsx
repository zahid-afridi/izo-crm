'use client';

import { RolesPage } from '@/components/pages/RolesPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function RolesRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <RolesPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
