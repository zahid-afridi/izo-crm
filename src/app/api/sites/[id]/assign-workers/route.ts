import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET available workers (users with role='worker')
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Get all workers
    const allWorkers = await prisma.users.findMany({
      where: {
        role: 'worker',
        status: 'active',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
      },
    });

    // Get current site to see assigned workers
    const site = await prisma.site.findUnique({
      where: { id },
    });

    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Get assigned workers
    let assignedWorkers: any[] = [];
    if (site.workerIds && site.workerIds.length > 0) {
      assignedWorkers = await prisma.users.findMany({
        where: {
          id: { in: site.workerIds },
          role: 'worker',
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
        },
      });
    }

    // Get available workers (not assigned to this site)
    const availableWorkers = allWorkers.filter(
      (worker) => !site.workerIds.includes(worker.id)
    );

    return NextResponse.json(
      { availableWorkers, assignedWorkers },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching workers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workers' },
      { status: 500 }
    );
  }
}

// POST assign worker to site
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { workerId } = body;

    if (!workerId) {
      return NextResponse.json(
        { error: 'Worker ID is required' },
        { status: 400 }
      );
    }

    // Verify worker exists and has worker role
    const worker = await prisma.users.findUnique({
      where: { id: workerId },
    });

    if (!worker) {
      return NextResponse.json(
        { error: 'Worker not found' },
        { status: 404 }
      );
    }

    if (worker.role !== 'worker') {
      return NextResponse.json(
        { error: 'User must have worker role' },
        { status: 400 }
      );
    }

    // Get current site
    const site = await prisma.site.findUnique({
      where: { id },
    });

    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Check if worker already assigned
    if (site.workerIds.includes(workerId)) {
      return NextResponse.json(
        { error: 'Worker already assigned to this site' },
        { status: 400 }
      );
    }

    // Add worker to site
    const updatedSite = await prisma.site.update({
      where: { id },
      data: {
        workerIds: [...site.workerIds, workerId],
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

    // Fetch all worker details
    let workers: any[] = [];
    if (updatedSite.workerIds && updatedSite.workerIds.length > 0) {
      workers = await prisma.users.findMany({
        where: {
          id: { in: updatedSite.workerIds },
          role: 'worker',
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
        },
      });
    }

    return NextResponse.json(
      {
        message: 'Worker assigned successfully',
        site: { ...updatedSite, workers, assignedWorkers: workers.length },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error assigning worker:', error);
    return NextResponse.json(
      { error: 'Failed to assign worker' },
      { status: 500 }
    );
  }
}

// DELETE remove worker from site
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { workerId } = body;

    if (!workerId) {
      return NextResponse.json(
        { error: 'Worker ID is required' },
        { status: 400 }
      );
    }

    // Get current site
    const site = await prisma.site.findUnique({
      where: { id },
    });

    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Remove worker from site
    const updatedSite = await prisma.site.update({
      where: { id },
      data: {
        workerIds: site.workerIds.filter((id) => id !== workerId),
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

    // Fetch remaining worker details
    let workers: any[] = [];
    if (updatedSite.workerIds && updatedSite.workerIds.length > 0) {
      workers = await prisma.users.findMany({
        where: {
          id: { in: updatedSite.workerIds },
          role: 'worker',
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
        },
      });
    }

    return NextResponse.json(
      {
        message: 'Worker removed successfully',
        site: { ...updatedSite, workers, assignedWorkers: workers.length },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing worker:', error);
    return NextResponse.json(
      { error: 'Failed to remove worker' },
      { status: 500 }
    );
  }
}
