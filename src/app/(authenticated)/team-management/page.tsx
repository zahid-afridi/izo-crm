'use client';

import { TeamManagementPage } from '@/components/pages/TeamManagementPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function TeamManagementRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <TeamManagementPage />
    </AuthenticatedLayout>
  );
}