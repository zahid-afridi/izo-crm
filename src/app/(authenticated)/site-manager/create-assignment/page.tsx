'use client';

import { SiteManagerAssignments } from '@/components/pages/SiteManagerAssignments';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function CreateAssignmentRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <SiteManagerAssignments />
    </AuthenticatedLayout>
  );
}
