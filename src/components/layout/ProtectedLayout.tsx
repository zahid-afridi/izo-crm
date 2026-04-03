'use client';

import { usePathname } from 'next/navigation';
import { useRouteProtection } from '@/hooks/useRouteProtection';
import { ReactNode } from 'react';

interface ProtectedLayoutProps {
  children: ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const pathname = usePathname();
  useRouteProtection(pathname);

  return <>{children}</>;
}
