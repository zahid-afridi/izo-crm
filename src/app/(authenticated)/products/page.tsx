'use client';

import { ProductsPage } from '@/components/pages/ProductsPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function ProductsRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <ProductsPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
