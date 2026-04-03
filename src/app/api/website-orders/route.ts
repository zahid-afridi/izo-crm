import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all website orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderStatus = searchParams.get('orderStatus');
    const orderType = searchParams.get('orderType');

    const where: any = {};
    
    if (orderStatus) where.orderStatus = orderStatus;
    if (orderType) where.orderType = orderType;

    const orders = await prisma.websiteOrder.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error('Error fetching website orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website orders' },
      { status: 500 }
    );
  }
}
