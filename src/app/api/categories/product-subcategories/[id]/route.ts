import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single product subcategory
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subcategory = await prisma.productSubcategory.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!subcategory) {
      return NextResponse.json(
        { error: 'Product subcategory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ subcategory }, { status: 200 });
  } catch (error) {
    console.error('Error fetching product subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product subcategory' },
      { status: 500 }
    );
  }
}

// PUT update product subcategory
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, categoryId } = body;

    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Name and categoryId are required' },
        { status: 400 }
      );
    }

    // Check if subcategory name already exists in this category (excluding current subcategory)
    const existingSubcategory = await prisma.productSubcategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive', // Case-insensitive comparison
        },
        categoryId: categoryId,
        id: {
          not: id, // Exclude current subcategory from check
        },
      },
    });

    if (existingSubcategory) {
      return NextResponse.json(
        { error: 'Subcategory name already exists in this category' },
        { status: 400 }
      );
    }

    const subcategory = await prisma.productSubcategory.update({
      where: { id },
      data: { name, categoryId },
      include: {
        category: true,
      },
    });

    return NextResponse.json(
      { message: 'Product subcategory updated successfully', subcategory },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating product subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to update product subcategory' },
      { status: 500 }
    );
  }
}

// DELETE product subcategory
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.productSubcategory.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Product subcategory deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting product subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to delete product subcategory' },
      { status: 500 }
    );
  }
}
