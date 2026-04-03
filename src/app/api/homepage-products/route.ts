import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all homepage products
export async function GET(request: NextRequest) {
  try {
    const homepageProducts = await prisma.homepageProduct.findMany({
      include: {
        product: {
          include: {
            subcategory: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    return NextResponse.json({ homepageProducts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching homepage products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage products' },
      { status: 500 }
    );
  }
}

// POST add product to homepage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, displayOrder } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if already added to homepage
    const existing = await prisma.homepageProduct.findUnique({
      where: { productId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Product already added to homepage' },
        { status: 400 }
      );
    }

    const homepageProduct = await prisma.homepageProduct.create({
      data: {
        productId,
        displayOrder: displayOrder || 0,
        isActive: true,
      },
      include: {
        product: {
          include: {
            subcategory: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      { message: 'Product added to homepage', homepageProduct },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error adding product to homepage:', error);
    
    return NextResponse.json(
      { error: 'Failed to add product to homepage' },
      { status: 500 }
    );
  }
}
