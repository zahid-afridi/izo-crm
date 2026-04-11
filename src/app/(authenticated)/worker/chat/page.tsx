'use client';

import { WorkerChat } from '@/components/pages/WorkerChat';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function WorkerChatRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <WorkerChat
        userRole={user?.role || 'worker'}
        userId={user?.id || ''}
        userName={user?.fullName || 'User'}
      />
    </AuthenticatedLayout>
  );
}
