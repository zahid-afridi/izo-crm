import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { logActivity } from '@/lib/activity-logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = requireRole(request, ['order_manager']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { action, notes, modifications, newStatus } = body;

    if (!['approve', 'reject', 'modify'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, reject, or modify' },
        { status: 400 }
      );
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update order based on action
    let updatedOrder;
    let activityDescription = '';

    switch (action) {
      case 'approve':
        updatedOrder = await prisma.order.update({
          where: { id },
          data: {
            orderStatus: newStatus || 'processing',
            notes: notes ? `${order.notes || ''}\n[APPROVED] ${notes}`.trim() : order.notes,
          },
        });
        activityDescription = `Order ${order.orderNumber} approved by Order Manager`;
        break;

      case 'reject':
        if (!notes || notes.trim() === '') {
          return NextResponse.json(
            { error: 'Rejection reason is required' },
            { status: 400 }
          );
        }
        updatedOrder = await prisma.order.update({
          where: { id },
          data: {
            orderStatus: 'cancelled',
            notes: `${order.notes || ''}\n[REJECTED] ${notes}`.trim(),
          },
        });
        activityDescription = `Order ${order.orderNumber} rejected by Order Manager: ${notes}`;
        break;

      case 'modify':
        if (!modifications || modifications.trim() === '' || !notes || notes.trim() === '') {
          return NextResponse.json(
            { error: 'Modification details and notes are required' },
            { status: 400 }
          );
        }
        updatedOrder = await prisma.order.update({
          where: { id },
          data: {
            orderStatus: 'pending_modification',
            notes: `${order.notes || ''}\n[MODIFICATION REQUESTED] ${modifications}\nNotes: ${notes}`.trim(),
          },
        });
        activityDescription = `Order ${order.orderNumber} modification requested by Order Manager: ${modifications}`;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Log the activity
    await logActivity({
      userId: auth.user!.userId,
      action: action,
      module: 'orders',
      resourceId: id,
      resourceName: order.orderNumber,
      description: activityDescription,
      changes: {
        status: { from: order.orderStatus, to: updatedOrder.orderStatus },
        action: action,
        notes: notes,
        ...(modifications && { modifications: modifications })
      },
    });

    // TODO: Send notification to the order creator about the decision
    // This could be implemented with email notifications or in-app notifications

    return NextResponse.json({
      message: `Order ${action}d successfully`,
      order: updatedOrder,
    });

  } catch (error) {
    console.error('Error processing order approval:', error);
    return NextResponse.json(
      { error: 'Failed to process order approval' },
      { status: 500 }
    );
  }
}