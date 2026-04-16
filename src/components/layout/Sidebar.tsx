'use client';

import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Store,
  ShoppingCart,
  Globe,
  BarChart3,
  X,
  MessageSquare,
  Wrench,
  Building2,
  Calendar,
  Car,
  History,
  CheckCircle,
  Settings,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuthRedux } from '@/hooks/useAuthRedux';
import Image from 'next/image';
import Logo from '@/../public/logo.svg';
import { useAppSelector } from '@/store/hooks';
import { selectSettingsForShell } from '@/store/selectors/settingsSelectors';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onNavigate?: (path: string) => void;
  currentPage?: string;
  setCurrentPage?: (page: string) => void;
}

// Define which menu items each role can see
const ROLE_MENU_ACCESS: Record<string, string[]> = {
  worker: ['/workers', '/chat', '/attendance'],
  admin: ['*'],           // Admin sees everything
  product_manager: ['/products', '/chat', '/attendance'],
  site_manager: ['/sites', '/assignments', '/cars', '/teams', '/attendance'],
  offer_manager: ['/offers', '/service-packages', '/clients', '/products', '/chat', '/attendance'],
  order_manager: ['/orders', '/clients', '/products', '/chat', '/team-management', '/order-management', '/attendance'],
  sales_agent: ['/clients', '/orders', '/products', '/chat', '/attendance'],
  office_employee: ['/orders', '/chat', '/attendance'],
  website_manager: ['/website-manager', '/chat', '/attendance'],
  hr: ['/workers', '/chat', '/attendance'],
};

// Filter menu items based on user role
function filterMenuByRole(items: typeof menuItems, role: string | null): typeof menuItems {
  if (!role) return [];

  // Get allowed paths for the role
  const allowedPaths = ROLE_MENU_ACCESS[role] || [];

  // If role has wildcard access, still filter out role-specific items
  if (allowedPaths.includes('*')) {
    // Admin sees all items except team-management and order-management (which are only for order_manager)
    return items.filter(item =>
      item.path !== '/team-management' &&
      item.path !== '/order-management'
    );
  }

  // Filter items based on allowed paths
  return items.filter(item =>
    allowedPaths.some(path => item.path.startsWith(path))
  );
}

const menuItems = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/products', labelKey: 'nav.products', icon: Package },
  // { path: '/services', labelKey: 'nav.services', icon: Wrench },
  { path: '/sites', labelKey: 'nav.sites', icon: Building2 },
  { path: '/assignments', labelKey: 'nav.assignments', icon: Calendar },
  { path: '/workers', labelKey: 'nav.workers', icon: Users },
  { path: '/cars', labelKey: 'nav.cars', icon: Car },
  { path: '/teams', labelKey: 'nav.teams', icon: Users },
  { path: '/offers', labelKey: 'nav.offers', icon: FileText },
  { path: '/service-packages', labelKey: 'nav.servicePackages', icon: Package },
  { path: '/clients', labelKey: 'nav.clients', icon: Store },
  { path: '/orders', labelKey: 'nav.orders', icon: ShoppingCart },
  { path: '/order-management', labelKey: 'nav.orderManagement', icon: CheckCircle },
  { path: '/team-management', labelKey: 'nav.teamManagement', icon: Users },
  { path: '/website-manager', labelKey: 'nav.websiteManager', icon: Globe },
  { path: '/chat', labelKey: 'nav.chat', icon: MessageSquare },
  { path: '/attendance', labelKey: 'nav.attendance', icon: Calendar },
  { path: '/activity-log', labelKey: 'nav.activityLog', icon: History },
  { path: '/reports', labelKey: 'nav.reports', icon: BarChart3 },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
];

export function Sidebar({ isOpen, setIsOpen, onNavigate, currentPage, setCurrentPage }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useAuthRedux();
  const shell = useAppSelector(selectSettingsForShell);
  const companyTitle = shell.companyDisplayName?.trim() || 'IzoGrup';
  const headline = shell.tagline?.trim() || 'Construction mangement system';
  const footerTagline = shell.tagline?.trim() || 'Construction mangement system';
  const role = user?.role?.toLowerCase() || null;

  // Get filtered menu items based on user role
  const visibleMenuItems = filterMenuByRole(menuItems, role);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className="fixed inset-0 bg-black/50 lg:hidden z-40"
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-brand-gradient">
          <button
            onClick={() => {
              if (onNavigate) {
                onNavigate('/dashboard');
              } else if (setCurrentPage) {
                setCurrentPage('dashboard');
              }
              // Close sidebar on mobile after selection
              if (window.innerWidth < 1024) {
                setIsOpen(false);
              }
            }}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            {shell.logoUrl?.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element -- dynamic S3 / CDN URL from settings
              <img src={shell.logoUrl.trim()} alt="" className="h-[50px] w-[50px] shrink-0 object-contain" />
            ) : (
              <Image src={Logo} width={50} height={50} alt="" />
            )}

            <div className="min-w-0 text-left">
              <h2 className="text-white font-semibold truncate">{companyTitle}</h2>
              <p className="text-xs text-white/80 truncate">{headline}</p>
            </div>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1 hover:bg-white/10 rounded text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1">
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const pageName = item.path.replace('/', '');
              const isActive = currentPage ? currentPage === pageName : pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate(item.path);
                    } else if (setCurrentPage) {
                      setCurrentPage(pageName);
                    }
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 1024) {
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                    ? 'bg-brand-gradient text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{t(item.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              if (onNavigate) {
                onNavigate('/dashboard');
              } else if (setCurrentPage) {
                setCurrentPage('dashboard');
              }
              // Close sidebar on mobile after selection
              if (window.innerWidth < 1024) {
                setIsOpen(false);
              }
            }}
            className="w-full flex items-center gap-3 p-3 bg-brand-gradient rounded-lg shadow-md hover:opacity-90 transition-opacity"
          >
            {shell.logoUrl?.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element -- dynamic S3 / CDN URL from settings
              <img src={shell.logoUrl.trim()} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
            ) : (
              <Image src={Logo} width={40} height={40} alt="" className="rounded-full" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{companyTitle}</p>
              <p className="text-xs text-white/80 truncate">{footerTagline}</p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
