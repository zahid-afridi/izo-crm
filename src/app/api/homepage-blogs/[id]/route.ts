import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT update homepage blog
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isActive, displayOrder } = body;

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    const homepageBlog = await prisma.homepageBlog.update({
      where: { id },
      data: updateData,
      include: {
        blog: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: 'Homepage blog updated successfully', homepageBlog },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating homepage blog:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Homepage blog not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update homepage blog' },
      { status: 500 }
    );
  }
}

// DELETE remove blog from homepage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.homepageBlog.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Blog removed from homepage successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error removing blog from homepage:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Homepage blog not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to remove blog from homepage' },
      { status: 500 }
    );
  }
}
