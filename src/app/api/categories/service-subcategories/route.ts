import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all service subcategories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const where = categoryId ? { categoryId } : {};

    const subcategories = await prisma.serviceSubcategory.findMany({
      where: {
        ...where,
        // Exclude "General" subcategories from the list
        NOT: {
          name: {
            in: ['General', 'Default', 'Other'],
            mode: 'insensitive',
          },
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ subcategories }, { status: 200 });
  } catch (error) {
    console.error('Error fetching service subcategories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service subcategories' },
      { status: 500 }
    );
  }
}

// POST create new service subcategory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, categoryId } = body;

    if (!name || !categoryId) {
      return NextResponse.json(
        { error: 'Name and categoryId are required' },
        { status: 400 }
      );
    }

    // Check if subcategory name already exists in this category
    const existingSubcategory = await prisma.serviceSubcategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive', // Case-insensitive comparison
        },
        categoryId: categoryId,
      },
    });

    if (existingSubcategory) {
      return NextResponse.json(
        { error: 'Subcategory name already exists in this category' },
        { status: 400 }
      );
    }

    const subcategory = await prisma.serviceSubcategory.create({
      data: { name, categoryId },
      include: {
        category: true,
      },
    });

    return NextResponse.json(
      { message: 'Service subcategory created successfully', subcategory },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating service subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to create service subcategory' },
      { status: 500 }
    );
  }
}
