import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get user basic info
    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        role: true,
        createdAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Initialize stats object
    const stats = {
      totalAssignments: 0,
      completedAssignments: 0,
      totalOrders: 0,
      completedOrders: 0,
      totalOffers: 0,
      acceptedOffers: 0,
    };

    // Get assignment stats if user is a worker
    if (user.role === 'worker') {
      const assignments = await prisma.assignment.findMany({
        where: { workerId: id }
      });

      stats.totalAssignments = assignments.length;
      stats.completedAssignments = assignments.filter(a => a.status === 'completed').length;
    }

    // Get order stats if user handles orders
    if (['admin', 'order_manager', 'office_employee'].includes(user.role)) {
      const orders = await prisma.order.findMany({
        where: { assignedToId: id }
      });

      stats.totalOrders = orders.length;
      stats.completedOrders = orders.filter(o => o.orderStatus === 'delivered').length;
    }

    // Get offer stats if user handles offers
    if (['admin', 'offer_manager'].includes(user.role)) {
      // Note: Offers don't have assignedToId, so we'll count all offers for now
      // You might want to add a createdBy field to offers to track this properly
      const offers = await prisma.offer.count();
      const acceptedOffers = await prisma.offer.count({
        where: { offerStatus: 'accepted' }
      });

      stats.totalOffers = offers;
      stats.acceptedOffers = acceptedOffers;
    }

    return NextResponse.json({
      user,
      stats
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}