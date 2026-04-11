import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sanitizeActivityDescription } from '@/lib/activityDescription';

function getTimeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) { const m = Math.floor(diff / 60); return `${m} minute${m > 1 ? 's' : ''} ago`; }
  if (diff < 86400) { const h = Math.floor(diff / 3600); return `${h} hour${h > 1 ? 's' : ''} ago`; }
  if (diff < 2592000) { const d = Math.floor(diff / 86400); return `${d} day${d > 1 ? 's' : ''} ago`; }
  return date.toLocaleDateString();
}

function getQuickActionsForRole(role: string) {
  switch (role) {
    case 'office_employee':
      return [
        { titleKey: 'quickActionProcessOrders', descKey: 'quickActionProcessOrdersDesc', icon: 'Package', action: '/orders', color: 'blue' },
        { titleKey: 'quickActionUpdatePayment', descKey: 'quickActionUpdatePaymentDesc', icon: 'DollarSign', action: '/orders', color: 'green' },
        { titleKey: 'quickActionInternalChat', descKey: 'quickActionInternalChatDesc', icon: 'MessageSquare', action: '/chat', color: 'purple' },
        { titleKey: 'quickActionViewReports', descKey: 'quickActionViewReportsDesc', icon: 'BarChart3', action: '/reports', color: 'orange' },
      ];
    case 'order_manager':
      return [
        { titleKey: 'quickActionManageOrders', descKey: 'quickActionManageOrdersDesc', icon: 'ShoppingCart', action: '/orders', color: 'blue' },
        { titleKey: 'quickActionViewOffers', descKey: 'quickActionViewOffersDesc', icon: 'FileText', action: '/offers', color: 'orange' },
        { titleKey: 'quickActionTeamChat', descKey: 'quickActionTeamChatDesc', icon: 'MessageSquare', action: '/chat', color: 'purple' },
        { titleKey: 'quickActionOrderReports', descKey: 'quickActionOrderReportsDesc', icon: 'BarChart3', action: '/reports', color: 'green' },
      ];
    default:
      return [
        { titleKey: 'quickActionAddProduct', descKey: 'quickActionAddProductDesc', icon: 'Package', action: '/products', color: 'blue' },
        { titleKey: 'quickActionAddSite', descKey: 'quickActionAddSiteDesc', icon: 'Building2', action: '/sites', color: 'green' },
        { titleKey: 'quickActionAddWorker', descKey: 'quickActionAddWorkerDesc', icon: 'UserPlus', action: '/workers', color: 'purple' },
        { titleKey: 'quickActionCreateOffer', descKey: 'quickActionCreateOfferDesc', icon: 'FileText', action: '/offers', color: 'orange' },
      ];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('role') || 'admin';

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Single query — all counts in one round trip using CTEs
    const [stats] = await prisma.$queryRaw<[{
      total_products: bigint;
      total_services: bigint;
      total_workers: bigint;
      active_workers: bigint;
      active_clients: bigint;
      orders_this_month: bigint;
      today_assignments: bigint;
      active_teams: bigint;
      total_sites: bigint;
      active_sites: bigint;
      completed_sites: bigint;
      total_offers: bigint;
      accepted_offers: bigint;
      total_orders: bigint;
      completed_orders: bigint;
      processing_orders: bigint;
      ready_orders: bigint;
      assigned_orders: bigint;
      completed_today: bigint;
    }]>`
      SELECT
        (SELECT COUNT(*) FROM "Product")                                                        AS total_products,
        (SELECT COUNT(*) FROM "Service")                                                        AS total_services,
        (SELECT COUNT(*) FROM "Users"      WHERE role = 'worker')                              AS total_workers,
        (SELECT COUNT(*) FROM "Worker"     WHERE "removeStatus" = 'active')                    AS active_workers,
        (SELECT COUNT(*) FROM "Client"     WHERE status = 'active')                            AS active_clients,
        (SELECT COUNT(*) FROM "Order"      WHERE "orderDate" >= ${startOfMonth})               AS orders_this_month,
        (SELECT COUNT(*) FROM "Assignment" WHERE "assignedDate" >= ${startOfDay}
                                             AND "assignedDate" <  ${endOfDay}
                                             AND status = 'active')                            AS today_assignments,
        (SELECT COUNT(*) FROM "Team"       WHERE status = 'active')                            AS active_teams,
        (SELECT COUNT(*) FROM "Site")                                                           AS total_sites,
        (SELECT COUNT(*) FROM "Site"       WHERE status = 'active')                            AS active_sites,
        (SELECT COUNT(*) FROM "Site"       WHERE status = 'completed')                         AS completed_sites,
        (SELECT COUNT(*) FROM "Offer")                                                          AS total_offers,
        (SELECT COUNT(*) FROM "Offer"      WHERE "offerStatus" = 'accepted')                   AS accepted_offers,
        (SELECT COUNT(*) FROM "Order")                                                          AS total_orders,
        (SELECT COUNT(*) FROM "Order"      WHERE "orderStatus" = 'completed')                  AS completed_orders,
        (SELECT COUNT(*) FROM "Order"      WHERE "orderStatus" = 'processing')                 AS processing_orders,
        (SELECT COUNT(*) FROM "Order"      WHERE "orderStatus" = 'ready')                      AS ready_orders,
        (SELECT COUNT(*) FROM "Order"      WHERE "assignedToId" IS NOT NULL
                                             AND "orderStatus" IN ('pending','processing','ready')) AS assigned_orders,
        (SELECT COUNT(*) FROM "Order"      WHERE "orderStatus" IN ('delivered','completed')
                                             AND "updatedAt" >= ${startOfDay}
                                             AND "updatedAt" <  ${endOfDay})                   AS completed_today
    `;

    // Recent activity — separate query, needs JOIN
    const recentActivity = await prisma.$queryRaw<{
      id: string;
      action: string;
      module: string;
      description: string;
      timestamp: Date;
      username: string | null;
      full_name: string | null;
      role: string | null;
    }[]>`
      SELECT
        a.id, a.action, a.module, a.description, a.timestamp,
        u.username, u."fullName" AS full_name, u.role
      FROM "ActivityLog" a
      LEFT JOIN "Users" u ON u.id = a."userId"
      ORDER BY a.timestamp DESC
      LIMIT 10
    `;

    // Convert bigint to number
    const n = (v: bigint) => Number(v);

    const totalSites      = n(stats.total_sites);
    const completedSites  = n(stats.completed_sites);
    const totalOffers     = n(stats.total_offers);
    const acceptedOffers  = n(stats.accepted_offers);
    const totalOrders     = n(stats.total_orders);
    const completedOrders = n(stats.completed_orders);
    const totalWorkers    = n(stats.total_workers);
    const activeWorkers   = n(stats.active_workers);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalProducts:    { value: n(stats.total_products),    label: 'Total Products',       icon: 'Package',      color: 'blue',   change: '+5%'  },
          activeSites:      { value: n(stats.active_sites),      label: 'Active Sites',         icon: 'Building2',    color: 'green',  change: '+12%' },
          totalWorkers:     { value: totalWorkers,               label: 'Workers',              icon: 'Users',        color: 'purple', change: '+3%'  },
          totalOffers:      { value: totalOffers,                label: 'Total Offers',         icon: 'FileText',     color: 'orange', change: '+8%'  },
          activeClients:    { value: n(stats.active_clients),    label: 'Active Clients',       icon: 'Building',     color: 'indigo', change: '+15%' },
          ordersThisMonth:  { value: n(stats.orders_this_month), label: 'Orders This Month',    icon: 'ShoppingCart', color: 'red',    change: '+22%' },
          assignedOrders:   { value: n(stats.assigned_orders),   label: 'Assigned Orders',      icon: 'ShoppingCart', color: 'blue',   change: '+5%'  },
          processingOrders: { value: n(stats.processing_orders), label: 'Processing Orders',    icon: 'Package',      color: 'orange', change: '+8%'  },
          readyOrders:      { value: n(stats.ready_orders),      label: 'Ready for Delivery',   icon: 'TrendingUp',   color: 'green',  change: '+12%' },
          completedToday:   { value: n(stats.completed_today),   label: 'Completed Today',      icon: 'FileText',     color: 'purple', change: '+3%'  },
        },
        metrics: {
          totalServices:      n(stats.total_services),
          completedSites,
          siteCompletionRate: totalSites > 0 ? Math.round((completedSites / totalSites) * 100) : 0,
          acceptedOffers,
          offerAcceptanceRate: totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : 0,
          completedOrders,
          orderCompletionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
          activeWorkers,
          workerUtilization: totalWorkers > 0 ? Math.round((activeWorkers / totalWorkers) * 100) : 0,
          todayAssignments: n(stats.today_assignments),
          activeTeams:      n(stats.active_teams),
        },
        recentActivity: recentActivity.map(a => ({
          id: a.id,
          action: a.action,
          module: a.module,
          description: sanitizeActivityDescription(a.description),
          user: (a.full_name && a.full_name.trim()) || a.username || 'System',
          userRole: a.role ? String(a.role) : '',
          timestamp: a.timestamp.toISOString(),
          timeAgo: getTimeAgo(a.timestamp),
        })),
        quickActions: getQuickActionsForRole(userRole),
        summary: { totalModules: 8, hasFullAccess: true, lastUpdated: now.toISOString() },
      },
    });

  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data', details: error.message },
      { status: 500 }
    );
  }
}
