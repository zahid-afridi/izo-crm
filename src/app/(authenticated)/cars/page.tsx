'use client';

import { CarsPage } from '@/components/pages/CarsPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function CarsRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <CarsPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
