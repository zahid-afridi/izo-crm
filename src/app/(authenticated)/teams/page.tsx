'use client';

import { TeamsPage } from '@/components/pages/TeamsPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function TeamsRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <TeamsPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
