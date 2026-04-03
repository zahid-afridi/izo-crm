'use client';

import { ChatPage } from '@/components/pages/ChatPage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/selectors/authSelectors';

export default function ChatRoute() {
  const user = useAppSelector(selectAuthUser);

  return (
    <AuthenticatedLayout>
      <ChatPage userRole={user?.role || ''} />
    </AuthenticatedLayout>
  );
}
