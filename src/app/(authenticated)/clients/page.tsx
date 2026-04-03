'use client';

import { ClientsPage } from '@/components/pages/ClientsPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function ClientsRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <ClientsPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
