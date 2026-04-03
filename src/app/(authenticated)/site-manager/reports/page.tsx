'use client';

import { SiteManagerReports } from '@/components/pages/SiteManagerReports';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function SiteReportsRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <SiteManagerReports />
    </AuthenticatedLayout>
  );
}
