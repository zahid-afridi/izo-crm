import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { logActivity } from '@/lib/activity-logger';

// GET single order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            role: true,
          }
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            role: true,
          }
        }
      }
    });

    // Fetch client details if clientId exists
    let clientDetails = null;
    if (order?.clientId) {
      try {
        clientDetails = await prisma.client.findUnique({
          where: { id: order.clientId },
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            address: true,
            dateOfBirth: true,
            idNumber: true,
            status: true
          }
        });
      } catch (error) {
        console.error('Error fetching client details:', error);
      }
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Fetch detailed information for order items
    let enrichedItems = [];
    if (order.items && Array.isArray(order.items)) {
      enrichedItems = await Promise.all(
        order.items.map(async (item: any) => {
          let itemDetails = null;
          
          try {
            if (item.type === 'product' && item.itemId) {
              itemDetails = await prisma.product.findUnique({
                where: { id: item.itemId },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  sku: true,
                  unit: true,
                  price: true,
                  stock: true,
                  status: true,
                  images: true,
                  subcategory: {
                    select: {
                      name: true,
                      category: {
                        select: {
                          name: true
                        }
                      }
                    }
                  }
                }
              });
            } else if (item.type === 'service' && item.itemId) {
              itemDetails = await prisma.service.findUnique({
                where: { id: item.itemId },
                select: {
                  id: true,
                  title: true,
                  description: true,
                  price: true,
                  images: true,
                  subcategory: {
                    select: {
                      name: true,
                      category: {
                        select: {
                          name: true
                        }
                      }
                    }
                  }
                }
              });
            } else if (item.type === 'package' && item.itemId) {
              itemDetails = await prisma.servicePackage.findUnique({
                where: { id: item.itemId },
                select: {
                  id: true,
                  name: true,
                  description: true,
                  unit: true,
                  price: true,
                  services: true,
                  products: true
                }
              });
            }
          } catch (error) {
            console.error(`Error fetching ${item.type} details for item ${item.itemId}:`, error);
          }

          return {
            ...item,
            details: itemDetails
          };
        })
      );
    }

    // Return order with enriched items and client details
    const orderWithDetails = {
      ...order,
      items: enrichedItems,
      clientDetails: clientDetails
    };

    return NextResponse.json({ order: orderWithDetails }, { status: 200 });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// PUT update order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireRole(request, ['admin', 'sales_agent', 'office_employee', 'order_manager']);
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    const body = await request.json();

    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const {
      client,
      orderTitle,
      orderDate,
      expectedDeliveryDate,
      orderStatus,
      paymentStatus,
      paymentMethod,
      deliveryMethod,
      deliveryAddress,
      deliveryInstructions,
      deliveryCost,
      currency,
      subtotal,
      tax,
      totalAmount,
      notes,
      assignedToId,
      items,
    } = body;

    const updateData: any = {};

    if (client) updateData.client = client;
    if (orderTitle !== undefined) updateData.orderTitle = orderTitle || null;
    if (orderDate) updateData.orderDate = new Date(orderDate);
    if (expectedDeliveryDate) updateData.expectedDeliveryDate = new Date(expectedDeliveryDate);
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (deliveryMethod !== undefined) updateData.deliveryMethod = deliveryMethod;
    if (deliveryAddress !== undefined) updateData.deliveryAddress = deliveryAddress;
    if (deliveryInstructions !== undefined) updateData.deliveryInstructions = deliveryInstructions;
    if (deliveryCost !== undefined) updateData.deliveryCost = deliveryCost;
    if (currency !== undefined) updateData.currency = currency;
    if (subtotal !== undefined) updateData.subtotal = subtotal;
    if (tax !== undefined) updateData.tax = tax;
    if (totalAmount) updateData.totalAmount = totalAmount;
    if (notes !== undefined) updateData.notes = notes;
    if (assignedToId !== undefined) {
      // Handle empty string as null for foreign key constraint
      updateData.assignedToId = assignedToId === '' ? null : assignedToId;
    }
    if (items !== undefined) updateData.items = items;

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    // Log the activity
    await logActivity({
      userId: auth.user!.userId,
      action: 'update',
      module: 'orders',
      resourceId: order.id,
      resourceName: order.orderNumber,
      description: `Order ${order.orderNumber} updated by ${auth.user!.role}`,
    });

    return NextResponse.json(
      { message: 'Order updated successfully', order },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating order:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Invalid assignment - user not found or not authorized' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// DELETE order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireRole(request, ['admin', 'order_manager']);
    if (!auth.authorized) return auth.response!;

    const { id } = await params;
    
    console.log('Attempting to delete order with ID:', id);
    
    // First check if the order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      console.log('Order not found:', id);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Delete the order
    await prisma.order.delete({
      where: { id },
    });

    // Log the activity
    await logActivity({
      userId: auth.user!.userId,
      action: 'delete',
      module: 'orders',
      resourceId: existingOrder.id,
      resourceName: existingOrder.orderNumber,
      description: `Order ${existingOrder.orderNumber} deleted by ${auth.user!.role}`,
    });

    console.log('Order deleted successfully:', id);
    return NextResponse.json(
      { message: 'Order deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting order:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Order not found or already deleted' },
        { status: 404 }
      );
    }

    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete order - it has related records that must be removed first' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
