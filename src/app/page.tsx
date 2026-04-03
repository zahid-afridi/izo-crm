'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { selectAuthIsLoading } from '@/store/selectors/authSelectors';

export default function HomePage() {
  const router = useRouter();
  const isLoading = useAppSelector(selectAuthIsLoading);

  useEffect(() => {
    if (!isLoading) {
      router.replace('/dashboard');
    }
  }, [isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
