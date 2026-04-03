import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all product subcategories
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const where = categoryId ? { categoryId } : {};

    const subcategories = await prisma.productSubcategory.findMany({
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
    console.error('Error fetching product subcategories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product subcategories' },
      { status: 500 }
    );
  }
}

// POST create new product subcategory
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
    const existingSubcategory = await prisma.productSubcategory.findFirst({
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

    const subcategory = await prisma.productSubcategory.create({
      data: { name, categoryId },
      include: {
        category: true,
      },
    });

    return NextResponse.json(
      { message: 'Product subcategory created successfully', subcategory },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product subcategory:', error);
    return NextResponse.json(
      { error: 'Failed to create product subcategory' },
      { status: 500 }
    );
  }
}
