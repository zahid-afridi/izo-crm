import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single offer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const offer = await prisma.offer.findUnique({
      where: { id },
    });

    if (!offer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ offer }, { status: 200 });
  } catch (error) {
    console.error('Error fetching offer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch offer' },
      { status: 500 }
    );
  }
}

// PUT update offer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existingOffer = await prisma.offer.findUnique({
      where: { id },
    });

    if (!existingOffer) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

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

    // Validate and process items if provided
    let validatedItems = existingOffer.items;
    let calculatedSubtotal = 0;

    if (items && Array.isArray(items)) {
      if (items.length === 0) {
        return NextResponse.json(
          { error: 'At least one item (product, service, or package) is required' },
          { status: 400 }
        );
      }

      validatedItems = [];

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
    }

    // Calculate totals if items were updated
    let finalSubtotal = subtotal;
    let finalTotal = totalAmount;

    if (items && Array.isArray(items)) {
      finalSubtotal = subtotal || calculatedSubtotal;
      const discountAmount = (finalSubtotal * (discount || 0)) / 100;
      const discountedAmount = finalSubtotal - discountAmount;
      finalTotal = totalAmount || discountedAmount;
    }

    const updateData: any = {
      clientId: clientId || null,
      client,
      title,
      description: description !== undefined ? description : existingOffer.description,
      offerDate: offerDate ? new Date(offerDate) : existingOffer.offerDate,
      validUntil: new Date(validUntil),
      offerStatus: offerStatus || existingOffer.offerStatus,
      currency: currency || existingOffer.currency,
      subtotal: finalSubtotal !== undefined ? finalSubtotal : existingOffer.subtotal,
      discount: discount !== undefined ? discount : existingOffer.discount,
      totalAmount: finalTotal !== undefined ? finalTotal : existingOffer.totalAmount,
      paymentTerms: paymentTerms !== undefined ? paymentTerms : existingOffer.paymentTerms,
      deliveryTerms: deliveryTerms !== undefined ? deliveryTerms : existingOffer.deliveryTerms,
      validityPeriod: validityPeriod !== undefined ? validityPeriod : existingOffer.validityPeriod,
      notes: notes !== undefined ? notes : existingOffer.notes,
      items: validatedItems,
    };

    const offer = await prisma.offer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(
      { 
        message: 'Offer updated successfully', 
        offer: {
          ...offer,
          itemsCount: Array.isArray(validatedItems) ? validatedItems.length : 0,
          calculatedSubtotal: calculatedSubtotal || finalSubtotal
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating offer:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update offer', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE offer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.offer.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Offer deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting offer:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete offer' },
      { status: 500 }
    );
  }
}
