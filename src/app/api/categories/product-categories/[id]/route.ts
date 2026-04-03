import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single product category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: {
        subcategories: true,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Product category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    console.error('Error fetching product category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product category' },
      { status: 500 }
    );
  }
}

// PUT update product category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if category name already exists (excluding current category)
    const existingCategory = await prisma.productCategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive', // Case-insensitive comparison
        },
        id: {
          not: id, // Exclude current category from check
        },
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 400 }
      );
    }

    const category = await prisma.productCategory.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(
      { message: 'Product category updated successfully', category },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating product category:', error);
    return NextResponse.json(
      { error: 'Failed to update product category' },
      { status: 500 }
    );
  }
}

// DELETE product category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.productCategory.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Product category deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting product category:', error);
    return NextResponse.json(
      { error: 'Failed to delete product category' },
      { status: 500 }
    );
  }
}
