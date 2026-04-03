import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// Role-based Quick Actions function
function getQuickActionsForRole(role: string) {
  switch (role) {
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
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userRole = searchParams.get('role') || 'admin';
    
    // Get current date for filtering
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Fetch all dashboard data in parallel
    const [
      totalProducts,
      totalServices,
      activeSites,
      totalWorkers,
      activeWorkers,
      totalOffers,
      activeClients,
      ordersThisMonth,
      recentActivity
    ] = await Promise.all([
      // Total Products
      prisma.product.count(),

      // Total Services  
      prisma.service.count(),

      // Active Sites
      prisma.site.count({
        where: {
          status: 'active'
        }
      }),

      // Total Workers
      prisma.users.count({
        where: {
          role: 'worker'
        }
      }),

      // Active Workers
      prisma.worker.count({
        where: {
          removeStatus: 'active'
        }
      }),

      // Total Offers
      prisma.offer.count(),

      // Active Clients
      prisma.client.count({
        where: {
          status: 'active'
        }
      }),

      // Orders This Month
      prisma.order.count({
        where: {
          orderDate: {
            gte: startOfMonth
          }
        }
      }),

      // Recent Activity (last 10 activities)
      prisma.activityLog.findMany({
        take: 10,
        orderBy: {
          timestamp: 'desc'
        },
        include: {
          user: {
            select: {
              username: true,
              fullName: true,
              role: true
            }
          }
        }
      })
    ]);

    // Get additional statistics
    const [
      totalSites,
      completedSites,
      allOffers,
      acceptedOffers,
      totalOrders,
      completedOrders,
      todayAssignments,
      activeTeams,
      // Office Employee specific metrics
      assignedOrders,
      processingOrders,
      readyOrders,
      completedToday
    ] = await Promise.all([
      // Total Sites
      prisma.site.count(),

      // Completed Sites
      prisma.site.count({
        where: {
          status: 'completed'
        }
      }),

      // Total Offers
      prisma.offer.count(),

      // Accepted Offers
      prisma.offer.count({
        where: {
          offerStatus: 'accepted'
        }
      }),

      // Total Orders
      prisma.order.count(),

      // Completed Orders
      prisma.order.count({
        where: {
          orderStatus: 'completed'
        }
      }),

      // Today's Assignments
      prisma.assignment.count({
        where: {
          assignedDate: {
            gte: startOfDay,
            lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
          },
          status: 'active'
        }
      }),

      // Active Teams
      prisma.team.count({
        where: {
          status: 'active'
        }
      }),

      // Office Employee - Assigned Orders (orders assigned to office employees)
      prisma.order.count({
        where: {
          assignedToId: {
            not: null
          },
          orderStatus: {
            in: ['pending', 'processing', 'ready']
          }
        }
      }),

      // Office Employee - Processing Orders
      prisma.order.count({
        where: {
          orderStatus: 'processing'
        }
      }),

      // Office Employee - Ready for Delivery Orders
      prisma.order.count({
        where: {
          orderStatus: 'ready'
        }
      }),

      // Office Employee - Completed Today
      prisma.order.count({
        where: {
          orderStatus: {
            in: ['delivered', 'completed']
          },
          updatedAt: {
            gte: startOfDay,
            lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Calculate percentages and growth
    const siteCompletionRate = totalSites > 0 ? Math.round((completedSites / totalSites) * 100) : 0;
    const offerAcceptanceRate = allOffers > 0 ? Math.round((acceptedOffers / allOffers) * 100) : 0;
    const orderCompletionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    const workerUtilization = totalWorkers > 0 ? Math.round((activeWorkers / totalWorkers) * 100) : 0;

    // Format recent activity
    const formattedActivity = recentActivity.map(activity => ({
      id: activity.id,
      action: activity.action,
      module: activity.module,
      description: activity.description,
      // Prefer username for display; fall back to full name, then "System"
      user: activity.user?.username || activity.user?.fullName || 'System',
      userRole: activity.user?.role || 'system',
      timestamp: activity.timestamp.toISOString(),
      timeAgo: getTimeAgo(activity.timestamp)
    }));

    // Get role-based quick actions
    const quickActions = getQuickActionsForRole(userRole);

    // Prepare dashboard data
    const dashboardData = {
      // Main Statistics Cards
      stats: {
        totalProducts: {
          value: totalProducts,
          label: 'Total Products',
          icon: 'Package',
          color: 'blue',
          change: '+5%' // You can calculate actual change if you store historical data
        },
        activeSites: {
          value: activeSites,
          label: 'Active Sites',
          icon: 'Building2',
          color: 'green',
          change: '+12%'
        },
        totalWorkers: {
          value: totalWorkers,
          label: 'Workers',
          icon: 'Users',
          color: 'purple',
          change: '+3%'
        },
        totalOffers: {
          value: totalOffers,
          label: 'Total Offers',
          icon: 'FileText',
          color: 'orange',
          change: '+8%'
        },
        activeClients: {
          value: activeClients,
          label: 'Active Clients',
          icon: 'Building',
          color: 'indigo',
          change: '+15%'
        },
        ordersThisMonth: {
          value: ordersThisMonth,
          label: 'Orders This Month',
          icon: 'ShoppingCart',
          color: 'red',
          change: '+22%'
        },
        // Office Employee specific stats
        assignedOrders: {
          value: assignedOrders,
          label: 'Assigned Orders',
          icon: 'ShoppingCart',
          color: 'blue',
          change: '+5%'
        },
        processingOrders: {
          value: processingOrders,
          label: 'Processing Orders',
          icon: 'Package',
          color: 'orange',
          change: '+8%'
        },
        readyOrders: {
          value: readyOrders,
          label: 'Ready for Delivery',
          icon: 'TrendingUp',
          color: 'green',
          change: '+12%'
        },
        completedToday: {
          value: completedToday,
          label: 'Completed Today',
          icon: 'FileText',
          color: 'purple',
          change: '+3%'
        }
      },

      // Additional Metrics
      metrics: {
        totalServices,
        completedSites,
        siteCompletionRate,
        acceptedOffers,
        offerAcceptanceRate,
        completedOrders,
        orderCompletionRate,
        activeWorkers,
        workerUtilization,
        todayAssignments,
        activeTeams
      },

      // Recent Activity
      recentActivity: formattedActivity,

      // Role-based Quick Actions
      quickActions,

      // Summary for the welcome message
      summary: {
        totalModules: 8, // Products, Services, Sites, Workers, etc.
        hasFullAccess: true,
        lastUpdated: now.toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}