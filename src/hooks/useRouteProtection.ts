import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser, selectAuthIsLoading } from '@/store/selectors/authSelectors';

interface RouteConfig {
  path: string;
  allowedRoles: string[];
}

const PROTECTED_ROUTES: RouteConfig[] = [
  // Admin - Full access
  { path: '/products', allowedRoles: ['admin'] },
  { path: '/services', allowedRoles: ['admin'] },
  { path: '/sites', allowedRoles: ['admin'] },
  { path: '/workers', allowedRoles: ['admin'] },
  { path: '/assignments', allowedRoles: ['admin'] },
  { path: '/teams', allowedRoles: ['admin'] },
  { path: '/cars', allowedRoles: ['admin'] },
  { path: '/offers', allowedRoles: ['admin'] },
  { path: '/clients', allowedRoles: ['admin'] },
  { path: '/orders', allowedRoles: ['admin'] },
  { path: '/website-manager', allowedRoles: ['admin'] },
  { path: '/reports', allowedRoles: ['admin'] },
  { path: '/roles', allowedRoles: ['admin'] },
  { path: '/settings', allowedRoles: ['admin'] },

  // Product Manager
  { path: '/products', allowedRoles: ['admin', 'product_manager'] },
  { path: '/services', allowedRoles: ['admin', 'product_manager'] },

  // Site Manager
  { path: '/sites', allowedRoles: ['admin', 'site_manager'] },
  { path: '/workers', allowedRoles: ['admin', 'site_manager'] },
  { path: '/assignments', allowedRoles: ['admin', 'site_manager'] },
  { path: '/teams', allowedRoles: ['admin', 'site_manager'] },
  { path: '/cars', allowedRoles: ['admin', 'site_manager'] },
  { path: '/reports', allowedRoles: ['admin', 'site_manager'] },

  // Offer Manager
  { path: '/offers', allowedRoles: ['admin', 'offer_manager'] },
  { path: '/clients', allowedRoles: ['admin', 'offer_manager'] },

  // Order Manager
  { path: '/orders', allowedRoles: ['admin', 'order_manager'] },

  // Sales Agent
  { path: '/clients', allowedRoles: ['admin', 'sales_agent'] },
  { path: '/orders', allowedRoles: ['admin', 'sales_agent'] },

  // Office Employee
  { path: '/orders', allowedRoles: ['admin', 'office_employee'] },

  // Website Manager
  { path: '/website-manager', allowedRoles: ['admin', 'website_manager'] },

  // Worker - ONLY Assignments
  { path: '/assignments', allowedRoles: ['admin', 'worker'] },
];

export function useRouteProtection(currentPath: string) {
  const router = useRouter();
  const user = useAppSelector(selectAuthUser);
  const isLoading = useAppSelector(selectAuthIsLoading);

  useEffect(() => {
    if (isLoading) return;

    const route = PROTECTED_ROUTES.find(r => currentPath.startsWith(r.path));
    
    if (route && user) {
      const hasAccess = route.allowedRoles.includes(user.role.toLowerCase());
      if (!hasAccess) {
        router.push('/403');
      }
    }
  }, [currentPath, user, isLoading, router]);
}
