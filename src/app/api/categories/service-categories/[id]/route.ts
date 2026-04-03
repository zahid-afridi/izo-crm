import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single service category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await prisma.serviceCategory.findUnique({
      where: { id },
      include: {
        subcategories: true,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Service category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    console.error('Error fetching service category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service category' },
      { status: 500 }
    );
  }
}

// PUT update service category
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
    const existingCategory = await prisma.serviceCategory.findFirst({
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

    const category = await prisma.serviceCategory.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(
      { message: 'Service category updated successfully', category },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating service category:', error);
    return NextResponse.json(
      { error: 'Failed to update service category' },
      { status: 500 }
    );
  }
}

// DELETE service category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.serviceCategory.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Service category deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting service category:', error);
    return NextResponse.json(
      { error: 'Failed to delete service category' },
      { status: 500 }
    );
  }
}
