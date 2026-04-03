import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { logActivity } from '@/lib/activity-logger';

// GET all orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const createdBy = searchParams.get('createdBy'); // New parameter for filtering by creator role

    const where: any = {};
    
    // Filter by status
    if (status && status !== 'all') {
      if (status.includes(',')) {
        // Multiple statuses
        where.orderStatus = { in: status.split(',') };
      } else {
        where.orderStatus = status;
      }
    }
    
    // Filter by assigned user
    if (assignedTo) {
      where.assignedToId = assignedTo;
    }

    // Filter by creator role (for order management)
    if (createdBy) {
      const creatorRoles = createdBy.split(',');
      // Join with Users table to filter by creator role
      where.creator = {
        role: { in: creatorRoles }
      };
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
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

    // Enrich orders with basic item information for list view
    const ordersWithBasicItemInfo = await Promise.all(
      orders.map(async (order) => {
        let enrichedItems = [];
        if (order.items && Array.isArray(order.items)) {
          enrichedItems = await Promise.all(
            order.items.map(async (item: any) => {
              let itemName = item.name;
              
              try {
                if (item.type === 'product' && item.itemId) {
                  const product = await prisma.product.findUnique({
                    where: { id: item.itemId },
                    select: { title: true }
                  });
                  if (product) itemName = product.title;
                } else if (item.type === 'service' && item.itemId) {
                  const service = await prisma.service.findUnique({
                    where: { id: item.itemId },
                    select: { title: true }
                  });
                  if (service) itemName = service.title;
                } else if (item.type === 'package' && item.itemId) {
                  const servicePackage = await prisma.servicePackage.findUnique({
                    where: { id: item.itemId },
                    select: { name: true }
                  });
                  if (servicePackage) itemName = servicePackage.name;
                }
              } catch (error) {
                console.error(`Error fetching ${item.type} name for item ${item.itemId}:`, error);
              }

              return {
                ...item,
                name: itemName
              };
            })
          );
        }

        return {
          ...order,
          items: enrichedItems,
          assignedTo: order.assignedTo?.fullName || null,
        };
      })
    );

    return NextResponse.json({ orders: ordersWithBasicItemInfo }, { status: 200 });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// POST create new order
export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin', 'sales_agent', 'office_employee', 'order_manager']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();

    const {
      clientId,
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
      totalAmount,
      notes,
      assignedToId,
      items,
    } = body;

    console.log('Received order data:', {
      clientId,
      client,
      orderTitle,
      orderDate,
      totalAmount,
      items: items?.length || 0,
      body: JSON.stringify(body, null, 2)
    });

    if (!client) {
      console.log('Validation failed: Client is required');
      return NextResponse.json(
        { error: 'Client is required' },
        { status: 400 }
      );
    }

    if (totalAmount === undefined || totalAmount === null) {
      console.log('Validation failed: Total amount is required');
      return NextResponse.json(
        { error: 'Total amount is required' },
        { status: 400 }
      );
    }

    // Generate unique order number with retry logic
    let orderNumber: string | undefined;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const orderCount = await prisma.order.count();
      const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
      orderNumber = `ORD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(3, '0')}-${timestamp}`;
      
      // Check if this order number already exists
      const existingOrder = await prisma.order.findUnique({
        where: { orderNumber }
      });
      
      if (!existingOrder) {
        break; // Unique number found
      }
      
      attempts++;
      // Wait a bit before retry
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    if (attempts >= maxAttempts || !orderNumber) {
      return NextResponse.json(
        { error: 'Failed to generate unique order number' },
        { status: 500 }
      );
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        clientId: clientId || null,
        client,
        orderTitle: orderTitle || null,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        orderStatus: orderStatus || 'pending',
        paymentStatus: paymentStatus || 'pending',
        paymentMethod: paymentMethod || null,
        deliveryMethod: deliveryMethod || null,
        deliveryAddress: deliveryAddress || null,
        deliveryInstructions: deliveryInstructions || null,
        deliveryCost: deliveryCost || 0,
        currency: currency || 'eur',
        subtotal: subtotal || 0,
        totalAmount,
        notes: notes || null,
        assignedToId: assignedToId || null,
        createdBy: auth.user!.userId, // Store the ID of the user who created the order
        items: items || [],
      },
    });

    // Log the activity
    await logActivity({
      userId: auth.user!.userId,
      action: 'create',
      module: 'orders',
      resourceId: order.id,
      resourceName: order.orderNumber,
      description: `Order ${order.orderNumber} created by ${auth.user!.role}`,
    });

    return NextResponse.json(
      { message: 'Order created successfully', order },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
