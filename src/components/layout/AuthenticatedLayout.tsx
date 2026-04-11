'use client';

import { useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthRedux } from '@/hooks/useAuthRedux';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout, isLoading } = useAuthRedux();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const isChatPage = pathname === '/chat';
  const pathToPage: Record<string, string> = {
    '/dashboard': 'dashboard', '/products': 'products', '/services': 'services', '/sites': 'sites',
    '/workers': 'workers', '/assignments': 'assignments', '/teams': 'teams', '/offers': 'offers',
    '/service-packages': 'service-packages', '/clients': 'clients', '/orders': 'orders',
    '/order-management': 'order-management', '/team-management': 'team-management',
    '/website-manager': 'website-manager', '/chat': 'Messages', '/activity-log': 'activity-log',
    '/reports': 'reports', '/settings': 'settings', '/profile': 'profile',
  };
  const currentPage = isChatPage ? 'Messages' : (pathToPage[pathname] ?? (pathname.replace('/', '').split('/')[0] || undefined));

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  // Middleware will redirect if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onNavigate={(path) => router.push(path)}
      />
      <div
        className={`flex-1 flex flex-col w-full min-w-0 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
          }`}
      >
        <Header
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLogout={logout}
          currentUser={user}
          currentPage={currentPage}
          userRole={user.role}
        />
        <main className={`flex-1 w-full min-w-0 overflow-x-hidden ${isChatPage
            ? 'overflow-hidden'
            : 'overflow-y-auto p-4 sm:p-6'
          }`}>
          {children}
        </main>
      </div>
    </div>
  );
}
