import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all service categories
export async function GET() {
  try {
    const categories = await prisma.serviceCategory.findMany({
      include: {
        subcategories: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error('Error fetching service categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service categories' },
      { status: 500 }
    );
  }
}

// POST create new service category
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
    const existingCategory = await prisma.serviceCategory.findFirst({
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

    const category = await prisma.serviceCategory.create({
      data: { name },
    });

    return NextResponse.json(
      { message: 'Service category created successfully', category },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating service category:', error);
    return NextResponse.json(
      { error: 'Failed to create service category' },
      { status: 500 }
    );
  }
}
