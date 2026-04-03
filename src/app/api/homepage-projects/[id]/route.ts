import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE remove project from homepage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.homepageProject.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Project removed from homepage' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error removing project from homepage:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Homepage project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to remove project from homepage' },
      { status: 500 }
    );
  }
}

// PUT update homepage project settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isActive, displayOrder } = body;

    const homepageProject = await prisma.homepageProject.update({
      where: { id },
      data: {
        isActive,
        displayOrder,
      },
      include: {
        project: true,
      },
    });

    return NextResponse.json(
      { message: 'Homepage project updated', homepageProject },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating homepage project:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Homepage project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update homepage project' },
      { status: 500 }
    );
  }
}
