import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE remove product from homepage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.homepageProduct.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Product removed from homepage' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error removing product from homepage:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Homepage product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to remove product from homepage' },
      { status: 500 }
    );
  }
}

// PUT update homepage product (order, active status)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { displayOrder, isActive } = body;

    const homepageProduct = await prisma.homepageProduct.update({
      where: { id },
      data: {
        displayOrder: displayOrder !== undefined ? displayOrder : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
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
      { message: 'Homepage product updated', homepageProduct },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating homepage product:', error);
    
    return NextResponse.json(
      { error: 'Failed to update homepage product' },
      { status: 500 }
    );
  }
}
