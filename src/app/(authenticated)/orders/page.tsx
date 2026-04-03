'use client';

import { OrdersPage } from '@/components/pages/OrdersPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function OrdersRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <OrdersPage userRole={user?.role || ''} userId={user?.id} />
    </AuthenticatedLayout>
  );
}
