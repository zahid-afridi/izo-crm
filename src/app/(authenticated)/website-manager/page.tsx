'use client';

import { WebsiteManagerPage } from '@/components/pages/WebsiteManagerPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function WebsiteManagerRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <WebsiteManagerPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
