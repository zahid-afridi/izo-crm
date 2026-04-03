import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT update blog category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name } = body;

    const category = await prisma.blogCategory.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(
      { message: 'Blog category updated successfully', category },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating blog category:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Blog category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update blog category' },
      { status: 500 }
    );
  }
}

// DELETE blog category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.blogCategory.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Blog category deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting blog category:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Blog category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete blog category' },
      { status: 500 }
    );
  }
}
