import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateFrom, dateTo } = body;

    const startDate = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = dateTo ? new Date(dateTo) : new Date();

    // Fetch orders for sales calculation
    const orders = await prisma.order.findMany({
      where: {
        orderDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Fetch clients
    const clients = await prisma.client.findMany({
      where: {
        status: 'active',
      },
    });

    // Fetch sites
    const sites = await prisma.site.findMany({
      where: {
        status: {
          in: ['active', 'closed'],
        },
      },
    });

    // Calculate stats
    const totalSales = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const approvedOrders = orders.filter(o => o.orderStatus === 'approved').length;
    const activeClients = clients.filter(c => c.status === 'active').length;
    const totalClients = clients.length;
    const activeSites = sites.filter(s => s.status === 'active').length;
    const completedSites = sites.filter(s => s.status === 'closed').length;

    return NextResponse.json({
      stats: {
        totalSales,
        totalOrders,
        approvedOrders,
        activeClients,
        totalClients,
        activeSites,
        completedSites,
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch stats: ' + err.message }, { status: 500 });
  }
}
