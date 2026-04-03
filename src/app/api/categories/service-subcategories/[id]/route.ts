import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single service subcategory
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subcategory = await prisma.serviceSubcategory.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!subcategory) {
      return NextResponse.json(
        { error: 'Service subcategory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ subcategory }, { status: 200 });
  } catch (error) {
    console.error('Error fetching service subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service subcategory' },
      { status: 500 }
    );
  }
}

// PUT update service subcategory
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
    const existingSubcategory = await prisma.serviceSubcategory.findFirst({
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

    const subcategory = await prisma.serviceSubcategory.update({
      where: { id },
      data: { name, categoryId },
      include: {
        category: true,
      },
    });

    return NextResponse.json(
      { message: 'Service subcategory updated successfully', subcategory },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating service subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to update service subcategory' },
      { status: 500 }
    );
  }
}

// DELETE service subcategory
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.serviceSubcategory.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Service subcategory deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting service subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to delete service subcategory' },
      { status: 500 }
    );
  }
}
