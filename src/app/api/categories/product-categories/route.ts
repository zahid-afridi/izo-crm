import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all product categories
export async function GET() {
  try {
    const categories = await prisma.productCategory.findMany({
      include: {
        subcategories: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error('Error fetching product categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product categories' },
      { status: 500 }
    );
  }
}

// POST create new product category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if category name already exists
    const existingCategory = await prisma.productCategory.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive', // Case-insensitive comparison
        },
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 400 }
      );
    }

    const category = await prisma.productCategory.create({
      data: { name },
    });

    return NextResponse.json(
      { message: 'Product category created successfully', category },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product category:', error);
    return NextResponse.json(
      { error: 'Failed to create product category' },
      { status: 500 }
    );
  }
}
