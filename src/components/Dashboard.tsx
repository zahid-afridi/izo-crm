import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Card } from './ui/card';
import { Package, Construction, Users, FileText, Store, ShoppingCart, TrendingUp, Calendar, Building2, UserPlus, Loader, MessageSquare, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardProps {
  userRole: string;
}

interface DashboardData {
  stats: Record<string, {
    value: number;
    label: string;
    icon: string;
    color: string;
    change: string;
  }>;
  metrics: {
    totalServices: number;
    completedSites: number;
    siteCompletionRate: number;
    acceptedOffers: number;
    offerAcceptanceRate: number;
    completedOrders: number;
    orderCompletionRate: number;
    activeWorkers: number;
    workerUtilization: number;
    todayAssignments: number;
    activeTeams: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    module: string;
    description: string;
    user: string;
    userRole: string;
    timestamp: string;
    timeAgo: string;
  }>;
  quickActions: Array<{
    title?: string;
    description?: string;
    titleKey?: string;
    descKey?: string;
    icon: string;
    action: string;
    color: string;
  }>;
  summary: {
    totalModules: number;
    hasFullAccess: boolean;
    lastUpdated: string;
  };
}

export function Dashboard({ userRole }: DashboardProps) {
  const { t } = useTranslation();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard?role=${userRole}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.error || 'Failed to load dashboard data');
      }
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError(err.message);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Handle quick action navigation
  const handleQuickAction = (action: string) => {
    // The action is already a route path from the API (e.g., '/products', '/sites')
    if (action.startsWith('/')) {
      router.push(action);
    } else {
      // Fallback for any non-path actions
      const actionRoutes: Record<string, string> = {
        'add_product': '/products',
        'add_site': '/sites',
        'add_worker': '/workers',
        'create_offer': '/offers',
        'add_client': '/clients',
        'create_order': '/orders',
        'add_assignment': '/assignments',
        'add_team': '/teams',
        'add_car': '/cars',
        'add_service': '/services',
        'add_service_package': '/service-packages',
        'website_manager': '/website-manager'
      };

      const route = actionRoutes[action];
      if (route) {
        router.push(route);
      } else {
        toast.error(`Navigation not configured for: ${action}`);
      }
    }
  };
  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      Package,
      Building2,
      Users,
      FileText,
      Store,
      ShoppingCart,
      Construction,
      UserPlus,
      Calendar,
      TrendingUp,
      MessageSquare: MessageSquare,
      BarChart3: TrendingUp,
      Building: Store,
      DollarSign: DollarSign
    };
    return icons[iconName] || Package;
  };

  // Client-side quick actions with i18n keys (ensures translations always work)
  const getQuickActionsForDisplay = () => {
    switch (userRole) {
      case 'office_employee':
        return [
          { titleKey: 'quickActionProcessOrders', descKey: 'quickActionProcessOrdersDesc', icon: 'Package', action: '/orders', color: 'blue' },
          { titleKey: 'quickActionUpdatePayment', descKey: 'quickActionUpdatePaymentDesc', icon: 'DollarSign', action: '/orders', color: 'green' },
          { titleKey: 'quickActionInternalChat', descKey: 'quickActionInternalChatDesc', icon: 'MessageSquare', action: '/chat', color: 'purple' },
          { titleKey: 'quickActionViewReports', descKey: 'quickActionViewReportsDesc', icon: 'BarChart3', action: '/reports', color: 'orange' }
        ];
      case 'order_manager':
        return [
          { titleKey: 'quickActionManageOrders', descKey: 'quickActionManageOrdersDesc', icon: 'ShoppingCart', action: '/orders', color: 'blue' },
          { titleKey: 'quickActionViewOffers', descKey: 'quickActionViewOffersDesc', icon: 'FileText', action: '/offers', color: 'orange' },
          { titleKey: 'quickActionTeamChat', descKey: 'quickActionTeamChatDesc', icon: 'MessageSquare', action: '/chat', color: 'purple' },
          { titleKey: 'quickActionOrderReports', descKey: 'quickActionOrderReportsDesc', icon: 'BarChart3', action: '/reports', color: 'green' }
        ];
      default:
        return [
          { titleKey: 'quickActionAddProduct', descKey: 'quickActionAddProductDesc', icon: 'Package', action: '/products', color: 'blue' },
          { titleKey: 'quickActionAddSite', descKey: 'quickActionAddSiteDesc', icon: 'Building2', action: '/sites', color: 'green' },
          { titleKey: 'quickActionAddWorker', descKey: 'quickActionAddWorkerDesc', icon: 'UserPlus', action: '/workers', color: 'purple' },
          { titleKey: 'quickActionCreateOffer', descKey: 'quickActionCreateOfferDesc', icon: 'FileText', action: '/offers', color: 'orange' }
        ];
    }
  };

  // Get stats based on role and available data
  const getStatsForRole = () => {
    if (!dashboardData) return [];

    const { stats, metrics } = dashboardData;

    switch (userRole) {
      case 'admin':
        return [
          {
            title: t('dashboard.totalProducts'),
            value: stats.totalProducts?.value?.toString() || '0',
            change: stats.totalProducts?.change || '+0%',
            icon: Package,
            color: 'bg-blue-500'
          },
          {
            title: t('dashboard.activeSites'),
            value: stats.activeSites?.value?.toString() || '0',
            change: stats.activeSites?.change || '+0%',
            icon: Construction,
            color: 'bg-green-500'
          },
          {
            title: t('dashboard.totalWorkers'),
            value: stats.totalWorkers?.value?.toString() || '0',
            change: stats.totalWorkers?.change || '+0%',
            icon: Users,
            color: 'bg-purple-500'
          },
          {
            title: t('dashboard.totalOffers'),
            value: stats.totalOffers?.value?.toString() || '0',
            change: stats.totalOffers?.change || '+0%',
            icon: FileText,
            color: 'bg-orange-500'
          },
          {
            title: t('dashboard.activeClients'),
            value: stats.activeClients?.value?.toString() || '0',
            change: stats.activeClients?.change || '+0%',
            icon: Store,
            color: 'bg-indigo-500'
          },
          {
            title: t('dashboard.ordersThisMonth'),
            value: stats.ordersThisMonth?.value?.toString() || '0',
            change: stats.ordersThisMonth?.change || '+0%',
            icon: ShoppingCart,
            color: 'bg-red-500'
          }
        ];
      case 'site_manager':
        return [
          {
            title: t('dashboard.activeSites'),
            value: stats.activeSites?.value?.toString() || '0',
            change: stats.activeSites?.change || '+0%',
            icon: Construction,
            color: 'bg-green-500'
          },
          {
            title: t('dashboard.activeWorkers'),
            value: metrics.activeWorkers?.toString() || '0',
            change: `${metrics.workerUtilization || 0}%`,
            icon: Users,
            color: 'bg-purple-500'
          },
          {
            title: t('dashboard.todayAssignments'),
            value: metrics.todayAssignments?.toString() || '0',
            change: '+0',
            icon: Calendar,
            color: 'bg-blue-500'
          },
          {
            title: t('dashboard.activeTeams'),
            value: metrics.activeTeams?.toString() || '0',
            change: '+0',
            icon: Users,
            color: 'bg-indigo-500'
          }
        ];
      case 'offer_manager':
        return [
          {
            title: t('dashboard.totalOffers'),
            value: stats.totalOffers?.value?.toString() || '0',
            change: stats.totalOffers?.change || '+0%',
            icon: FileText,
            color: 'bg-orange-500'
          },
          {
            title: t('dashboard.activeClients'),
            value: stats.activeClients?.value?.toString() || '0',
            change: stats.activeClients?.change || '+0%',
            icon: Store,
            color: 'bg-indigo-500'
          },
          {
            title: t('dashboard.acceptanceRate'),
            value: `${metrics.offerAcceptanceRate || 0}%`,
            change: '+0%',
            icon: TrendingUp,
            color: 'bg-green-500'
          }
        ];
      case 'sales_agent':
        return [
          {
            title: t('dashboard.ordersThisMonth'),
            value: stats.ordersThisMonth?.value?.toString() || '0',
            change: stats.ordersThisMonth?.change || '+0%',
            icon: ShoppingCart,
            color: 'bg-red-500'
          },
          {
            title: t('dashboard.activeClients'),
            value: stats.activeClients?.value?.toString() || '0',
            change: stats.activeClients?.change || '+0%',
            icon: Store,
            color: 'bg-indigo-500'
          },
          {
            title: t('dashboard.completionRate'),
            value: `${metrics.orderCompletionRate || 0}%`,
            change: '+0%',
            icon: TrendingUp,
            color: 'bg-green-500'
          }
        ];
      case 'office_employee':
        return [
          {
            title: t('dashboard.assignedOrders'),
            value: stats.assignedOrders?.value?.toString() || '0',
            change: stats.assignedOrders?.change || '+0%',
            icon: ShoppingCart,
            color: 'bg-blue-500'
          },
          {
            title: t('dashboard.processingOrders'),
            value: stats.processingOrders?.value?.toString() || '0',
            change: stats.processingOrders?.change || '+0%',
            icon: Package,
            color: 'bg-orange-500'
          },
          {
            title: t('dashboard.readyForDelivery'),
            value: stats.readyOrders?.value?.toString() || '0',
            change: stats.readyOrders?.change || '+0%',
            icon: TrendingUp,
            color: 'bg-green-500'
          },
          {
            title: t('dashboard.completedToday'),
            value: stats.completedToday?.value?.toString() || '0',
            change: stats.completedToday?.change || '+0%',
            icon: FileText,
            color: 'bg-purple-500'
          }
        ];
      default:
        return [
          {
            title: t('dashboard.welcome'),
            value: 'Dashboard',
            change: '',
            icon: Package,
            color: 'bg-brand-gradient'
          }
        ];
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto space-y-6">
        <Card className="p-6 bg-brand-gradient text-white shadow-lg">
          <div className="flex items-center gap-3">
            <Loader className="w-5 h-5 animate-spin" />
            <h2 className="text-white">{t('dashboard.loadingDashboard')}</h2>
          </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1600px] mx-auto space-y-6">
        <Card className="p-6 bg-red-50 border-red-200">
          <h2 className="text-red-800 mb-2">{t('dashboard.errorLoadingDashboard')}</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            {t('dashboard.retry')}
          </button>
        </Card>
      </div>
    );
  }

  const stats = getStatsForRole();

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Welcome Message */}
      <Card className="p-6 bg-brand-gradient text-white shadow-lg">
        <h2 className="text-white mb-2">{t('dashboard.welcomeToSystem')}</h2>
        <p className="text-white/90">
          {userRole === 'admin' && t('dashboard.roleAdmin')}
          {userRole === 'site_manager' && t('dashboard.roleSiteManager')}
          {userRole === 'offer_manager' && t('dashboard.roleOfferManager')}
          {userRole === 'product_manager' && t('dashboard.roleProductManager')}
          {userRole === 'sales_agent' && t('dashboard.roleSalesAgent')}
          {userRole === 'worker' && t('dashboard.roleWorker')}
          {userRole === 'order_manager' && t('dashboard.roleOrderManager')}
          {userRole === 'office_employee' && t('dashboard.roleOfficeEmployee')}
        </p>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                {stat.change && (
                  <div className={`text-xs px-2 py-1 rounded ${
                    stat.change.startsWith('+') ? 'bg-green-100 text-green-700' : 
                    stat.change.startsWith('-') ? 'bg-red-100 text-red-700' : 
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {stat.change}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {getQuickActionsForDisplay().map((action, index) => {
            const Icon = getIcon(action.icon);
            return (
              <button 
                key={index}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-brand-500 hover:bg-brand-50 transition-colors"
                onClick={() => handleQuickAction(action.action)}
              >
                <Icon className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                <p className="text-sm font-medium text-gray-700">{t(`dashboard.${action.titleKey}`)}</p>
                <p className="text-xs text-gray-500">{t(`dashboard.${action.descKey}`)}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Recent Activity */}
      {dashboardData?.recentActivity && ['admin', 'site_manager', 'offer_manager', 'order_manager'].includes(userRole) && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.recentActivity')}</h3>
          <div className="space-y-3">
            {dashboardData.recentActivity.length > 0 ? (
              dashboardData.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.action === 'create' ? 'bg-green-500' :
                    activity.action === 'update' ? 'bg-blue-500' :
                    activity.action === 'delete' ? 'bg-red-500' :
                    'bg-orange-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      by {activity.user} • {activity.timeAgo}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">
                    {activity.module}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>{t('dashboard.noRecentActivity')}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
