import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PUT assign site manager to site
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { siteManagerId } = body;

    if (!siteManagerId) {
      return NextResponse.json(
        { error: 'Site manager ID is required' },
        { status: 400 }
      );
    }

    // Verify site manager exists and has site_manager role
    const manager = await prisma.users.findUnique({
      where: { id: siteManagerId },
    });

    if (!manager) {
      return NextResponse.json(
        { error: 'Site manager not found' },
        { status: 404 }
      );
    }

    if (manager.role !== 'site_manager') {
      return NextResponse.json(
        { error: 'User must have site_manager role' },
        { status: 400 }
      );
    }

    // Update site with new manager
    const site = await prisma.site.update({
      where: { id },
      data: {
        siteManagerId,
      },
      include: {
        siteManager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: 'Site manager assigned successfully', site },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error assigning site manager:', error);
    return NextResponse.json(
      { error: 'Failed to assign site manager' },
      { status: 500 }
    );
  }
}

// DELETE remove site manager from site
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const site = await prisma.site.update({
      where: { id },
      data: {
        siteManagerId: null,
      },
      include: {
        siteManager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: 'Site manager removed successfully', site },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing site manager:', error);
    return NextResponse.json(
      { error: 'Failed to remove site manager' },
      { status: 500 }
    );
  }
}
