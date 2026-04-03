import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all offers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'all') where.offerStatus = status;

    const offers = await prisma.offer.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ offers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching offers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offers' },
      { status: 500 }
    );
  }
}

// POST create new offer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      clientId,
      client,
      title,
      description,
      offerDate,
      validUntil,
      offerStatus,
      currency,
      subtotal,
      discount,
      totalAmount,
      paymentTerms,
      deliveryTerms,
      validityPeriod,
      notes,
      items,
    } = body;

    // Validate required fields
    if (!client || !title) {
      return NextResponse.json(
        { error: 'Client and title are required' },
        { status: 400 }
      );
    }

    if (!validUntil) {
      return NextResponse.json(
        { error: 'Valid Until date is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item (product, service, or package) is required' },
        { status: 400 }
      );
    }

    // Validate client exists if clientId is provided
    if (clientId) {
      const clientExists = await prisma.client.findUnique({
        where: { id: clientId }
      });
      
      if (!clientExists) {
        return NextResponse.json(
          { error: 'Invalid client ID provided' },
          { status: 400 }
        );
      }
    }

    // Validate and process items
    const validatedItems = [];
    let calculatedSubtotal = 0;

    for (const item of items) {
      const { type, itemId, quantity = 1, unitPrice, discount: itemDiscount = 0 } = item;

      if (!type || !itemId || !['product', 'service', 'package'].includes(type)) {
        return NextResponse.json(
          { error: 'Each item must have a valid type (product, service, or package) and itemId' },
          { status: 400 }
        );
      }

      let validatedItem = null;

      // Validate and fetch item details based on type
      switch (type) {
        case 'product':
          const product = await prisma.product.findUnique({
            where: { id: itemId },
            include: {
              subcategory: {
                include: {
                  category: true
                }
              }
            }
          });
          
          if (!product) {
            return NextResponse.json(
              { error: `Product with ID ${itemId} not found` },
              { status: 400 }
            );
          }

          if (product.status !== 'active') {
            return NextResponse.json(
              { error: `Product "${product.title}" is not active` },
              { status: 400 }
            );
          }

          const productTotal = quantity * (unitPrice || product.price || 0) * (1 - itemDiscount / 100);
          calculatedSubtotal += productTotal;

          validatedItem = {
            type: 'product',
            itemId: product.id,
            name: product.title,
            description: product.description,
            sku: product.sku,
            unit: product.unit,
            quantity: quantity,
            unitPrice: unitPrice || product.price || 0,
            discount: itemDiscount,
            total: productTotal,
            category: product.subcategory?.category?.name,
            subcategory: product.subcategory?.name
          };
          break;

        case 'service':
          const service = await prisma.service.findUnique({
            where: { id: itemId },
            include: {
              subcategory: {
                include: {
                  category: true
                }
              }
            }
          });
          
          if (!service) {
            return NextResponse.json(
              { error: `Service with ID ${itemId} not found` },
              { status: 400 }
            );
          }

          const serviceTotal = quantity * (unitPrice || service.price || 0) * (1 - itemDiscount / 100);
          calculatedSubtotal += serviceTotal;

          validatedItem = {
            type: 'service',
            itemId: service.id,
            name: service.title,
            description: service.description,
            quantity: quantity,
            unitPrice: unitPrice || service.price || 0,
            discount: itemDiscount,
            total: serviceTotal,
            category: service.subcategory?.category?.name,
            subcategory: service.subcategory?.name
          };
          break;

        case 'package':
          const servicePackage = await prisma.servicePackage.findUnique({
            where: { id: itemId }
          });
          
          if (!servicePackage) {
            return NextResponse.json(
              { error: `Service package with ID ${itemId} not found` },
              { status: 400 }
            );
          }

          if (servicePackage.status !== 'active') {
            return NextResponse.json(
              { error: `Service package "${servicePackage.name}" is not active` },
              { status: 400 }
            );
          }

          const packageTotal = quantity * (unitPrice || servicePackage.price || 0) * (1 - itemDiscount / 100);
          calculatedSubtotal += packageTotal;

          validatedItem = {
            type: 'package',
            itemId: servicePackage.id,
            name: servicePackage.name,
            description: servicePackage.description,
            unit: servicePackage.unit,
            quantity: quantity,
            unitPrice: unitPrice || servicePackage.price || 0,
            discount: itemDiscount,
            total: packageTotal,
            services: servicePackage.services,
            products: servicePackage.products
          };
          break;
      }

      if (validatedItem) {
        validatedItems.push(validatedItem);
      }
    }

    // Calculate totals
    const finalSubtotal = subtotal || calculatedSubtotal;
    const discountAmount = (finalSubtotal * (discount || 0)) / 100;
    const finalTotal = totalAmount || (finalSubtotal - discountAmount);

    // Generate unique offer number with retry logic
    let offerNumber: string = '';
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const offerCount = await prisma.offer.count();
        const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
        offerNumber = `OFF-${new Date().getFullYear()}-${String(offerCount + 1).padStart(3, '0')}-${timestamp}`;

        // Check if this offer number already exists
        const existingOffer = await prisma.offer.findUnique({
          where: { offerNumber }
        });

        if (!existingOffer) {
          break; // Unique number found
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          // Fallback to UUID-based number
          const uuid = Math.random().toString(36).substring(2, 8).toUpperCase();
          offerNumber = `OFF-${new Date().getFullYear()}-${uuid}`;
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
      }
    }

    const offer = await prisma.offer.create({
      data: {
        offerNumber,
        clientId: clientId || null,
        client,
        title,
        description: description || null,
        offerDate: new Date(offerDate),
        validUntil: new Date(validUntil),
        offerStatus: offerStatus || 'sent',
        currency: currency || 'eur',
        subtotal: finalSubtotal,
        discount: discount || 0,
        totalAmount: finalTotal,
        paymentTerms: paymentTerms || null,
        deliveryTerms: deliveryTerms || null,
        validityPeriod: validityPeriod || null,
        notes: notes || null,
        items: validatedItems,
      },
    });

    return NextResponse.json(
      { 
        message: 'Offer created successfully', 
        offer: {
          ...offer,
          itemsCount: validatedItems.length,
          calculatedSubtotal,
          finalTotal
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { error: 'Failed to create offer', details: error.message },
      { status: 500 }
    );
  }
}
