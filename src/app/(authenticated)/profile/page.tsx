'use client';

import { ProfilePage } from '@/components/pages/ProfilePage';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';

export default function ProfileRoutePage() {
  return (
    <AuthenticatedLayout>
      <ProfilePage />
    </AuthenticatedLayout>
  );
}
