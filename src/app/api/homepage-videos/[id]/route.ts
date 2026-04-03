import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT update homepage video
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

    const homepageVideo = await prisma.homepageVideo.update({
      where: { id },
      data: updateData,
      include: {
        video: true,
      },
    });

    return NextResponse.json(
      { message: 'Homepage video updated successfully', homepageVideo },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating homepage video:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Homepage video not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update homepage video' },
      { status: 500 }
    );
  }
}

// DELETE remove video from homepage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.homepageVideo.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Video removed from homepage successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error removing video from homepage:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Homepage video not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to remove video from homepage' },
      { status: 500 }
    );
  }
}
