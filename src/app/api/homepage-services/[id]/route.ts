import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE remove service from homepage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.homepageService.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Service removed from homepage' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error removing service from homepage:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Homepage service not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to remove service from homepage' },
      { status: 500 }
    );
  }
}

// PUT update homepage service (order, active status)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { displayOrder, isActive } = body;

    const homepageService = await prisma.homepageService.update({
      where: { id },
      data: {
        displayOrder: displayOrder !== undefined ? displayOrder : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      include: {
        service: {
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
      { message: 'Homepage service updated', homepageService },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating homepage service:', error);
    
    return NextResponse.json(
      { error: 'Failed to update homepage service' },
      { status: 500 }
    );
  }
}
