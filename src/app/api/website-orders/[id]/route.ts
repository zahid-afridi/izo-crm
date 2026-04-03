import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single website order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.websiteOrder.findUnique({
      where: { id },
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
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    console.error('Error fetching website order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website order' },
      { status: 500 }
    );
  }
}

// PUT update website order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingOrder = await prisma.websiteOrder.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (body.orderStatus) updateData.orderStatus = body.orderStatus;
    if (body.paymentStatus) updateData.paymentStatus = body.paymentStatus;
    if (body.deliveryMethod) updateData.deliveryMethod = body.deliveryMethod;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const order = await prisma.websiteOrder.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json(
      { message: 'Order updated successfully', order },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating website order:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// DELETE website order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.websiteOrder.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Order deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting website order:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
