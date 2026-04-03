'use client';

import { OrderManagementPage } from '@/components/pages/OrderManagementPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function OrderManagementRoute() {
    const user = useAppSelector(selectAuthUser);

    return (
        <AuthenticatedLayout>
            <OrderManagementPage />
        </AuthenticatedLayout>
    );
}