'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Menu, Bell, Search, Globe, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { SearchResults } from '../SearchResults';
import { useGlobalSearch } from '@/hooks/useKeyboardShortcuts';

interface HeaderProps {
  toggleSidebar: () => void;
  onLogout: () => void;
  currentUser: { username: string; name?: string };
  currentPage?: string;
  userRole?: string;
  onExportUI?: () => void;
  onNavigate?: (page: string) => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  module: string;
  type: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export function Header({ toggleSidebar, onLogout, currentUser, currentPage, userRole, onExportUI, onNavigate }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleSearchClick = () => {
    setSearchOpen(true);
  };

  // Add keyboard shortcut support
  useGlobalSearch(() => setSearchOpen(true));

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setSearchOpen(true);
    }
  };

  const handleNavigate = (url: string) => {
    // Extract page name from URL for navigation
    const page = url.split('/')[1];
    if (onNavigate && page) {
      onNavigate(page);
    }
  };

  const handleNotificationNavigate = (notification: Notification) => {
    if (notification.module === 'assignments') {
      if (userRole === 'worker') {
        router.push('/workers');
      } else {
        router.push('/assignments');
      }
    }
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications?limit=10&unreadOnly=false');
        if (!res.ok) return;
        const data = await res.json();
        const list: Notification[] = data.notifications || [];
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.isRead).length);
      } catch {
        // Silent fail - header should not break on notification error
      }
    };

    fetchNotifications();
  }, []);

  const markAllNotificationsRead = async () => {
    try {
      if (unreadCount === 0) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await fetch('/api/notifications/mark-read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });
    } catch {
      // ignore
    }
  };

  const pageTitleKey: Record<string, string> = {
    dashboard: 'nav.dashboard', chat: 'nav.chat', Messages: 'nav.messages', products: 'nav.products', services: 'nav.services',
    sites: 'nav.sites', workers: 'nav.workers', assignments: 'nav.assignments', teams: 'nav.teams',
    offers: 'nav.offers', 'service-packages': 'nav.servicePackages', clients: 'nav.clients',
    orders: 'nav.orders', 'order-management': 'nav.orderManagement', 'team-management': 'nav.teamManagement',
    'website-manager': 'nav.websiteManager', 'activity-log': 'nav.activityLog', reports: 'nav.reports',
    settings: 'nav.settings', 'site-manager-dashboard': 'nav.dashboard', 'sites-management': 'nav.sites',
    'cars-management': 'nav.cars', 'workers-management': 'nav.workers', 'create-assignment': 'nav.assignments',
    'site-reports': 'nav.reports', 'worker-location-tracking': 'nav.workers', 'worker-dashboard': 'nav.dashboard',
    'worker-chat': 'nav.chat',
  };
  const pageTitle = currentPage && pageTitleKey[currentPage] ? t(pageTitleKey[currentPage]) : (currentPage ? currentPage : t('header.izoCrm'));

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-gray-900">{pageTitle}</h1>
                <p className="text-sm text-gray-500">{t('header.constructionSystem')}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Global Search */}
              <div className="hidden md:flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2 w-80 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={handleSearchClick}>
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('header.searchPlaceholder')}
                  className="border-0 bg-transparent p-0 focus-visible:ring-0 cursor-pointer"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  readOnly
                />
                <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>

              {/* Mobile Search Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={handleSearchClick}
              >
                <Search className="w-5 h-5" />
              </Button>

              {/* Language Selector */}
              <Select value={i18n.language || 'en'} onValueChange={(lang) => i18n.changeLanguage(lang)}>
                <SelectTrigger className="w-32">
                  <Globe className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('languages.en')}</SelectItem>
                  <SelectItem value="sq">{t('languages.sq')}</SelectItem>
                  <SelectItem value="it">{t('languages.it')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 bg-red-500 text-[10px] leading-[14px] text-white rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-hidden">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <p className="text-sm font-semibold text-gray-900">Notifications</p>
                    <button
                      className="text-xs text-brand-600 hover:underline disabled:text-gray-400"
                      disabled={unreadCount === 0}
                      onClick={markAllNotificationsRead}
                    >
                      Mark all as read
                    </button>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-500">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          className={`flex flex-col items-start gap-0.5 ${!notification.isRead ? 'bg-purple-50' : ''}`}
                          onClick={() => handleNotificationNavigate(notification)}
                        >
                          <span className="text-xs uppercase tracking-wide text-gray-400">
                            {notification.module}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </span>
                          <span className="text-xs text-gray-600 line-clamp-2">
                            {notification.message}
                          </span>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Dropdown */}
              {currentUser && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-brand-gradient rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-md">
                        {currentUser.name?.charAt(0) || currentUser.username?.charAt(0) || 'U'}
                      </div>
                      <div className="hidden md:block text-left">
                        <p className="text-sm text-gray-900">{currentUser.name || currentUser.username}</p>
                        <p className="text-xs text-gray-500">@{currentUser.username}</p>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="p-2">
                      <p className="text-sm text-gray-900">{currentUser.name || currentUser.username}</p>
                      <p className="text-xs text-gray-500">@{currentUser.username}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('common.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search Results Modal */}
      <SearchResults
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        initialQuery={searchQuery}
        onNavigate={handleNavigate}
      />
    </>
  );
}