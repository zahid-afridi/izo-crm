import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single site with populated data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Site ID is required' },
        { status: 400 }
      );
    }

    const site = await prisma.site.findUnique({
      where: { id },
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

    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Fetch worker assignments from the Assignment table
    const uniqueWorkers = await prisma.assignment.findMany({
      where: {
        siteId: site.id,
        status: 'active',
      },
      select: {
        workerId: true,
        worker: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
      distinct: ['workerId'], // Get unique workers only
    });

    const workers = uniqueWorkers.map(assignment => assignment.worker);
    const assignmentCount = await prisma.assignment.count({
      where: {
        siteId: site.id,
        status: 'active',
      },
    });

    return NextResponse.json(
      { site: { ...site, workers, assignedWorkers: workers.length, totalAssignments: assignmentCount } },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error fetching site:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch site. Please try again.' },
      { status: 500 }
    );
  }
}

// PATCH update specific fields (like status only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Check if site exists
    const existingSite = await prisma.site.findUnique({
      where: { id },
    });

    if (!existingSite) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Validation: Cannot set status to "on-hold" if progress is 100%
    if (status === 'on-hold' && existingSite.progress === 100) {
      return NextResponse.json(
        { error: 'Cannot set status to "on-hold" when progress is 100%. Please reduce progress first.' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (status) {
      updateData.status = status;
      // If status is set to completed, automatically set progress to 100%
      if (status === 'completed') {
        updateData.progress = 100;
        updateData.progressUpdatedAt = new Date();
        // Set actual end date if not already set
        if (!existingSite.actualEndDate) {
          updateData.actualEndDate = new Date();
        }
      }
    }

    const site = await prisma.site.update({
      where: { id },
      data: updateData,
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
      { message: 'Site updated successfully', site },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating site:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update site' },
      { status: 500 }
    );
  }
}

// PUT update site
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      address,
      city,
      postalCode,
      clientId,
      client,
      startDate,
      estimatedEndDate,
      actualEndDate,
      status,
      progress,
      progressNotes,
      siteManagerId,
      description,
    } = body;

    // Check if site exists
    const existingSite = await prisma.site.findUnique({
      where: { id },
    });

    if (!existingSite) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Verify site manager if provided (only validate if not null/empty)
    if (siteManagerId && siteManagerId.trim() !== '') {
      const manager = await prisma.users.findUnique({
        where: { id: siteManagerId },
      });
      
      if (!manager) {
        return NextResponse.json(
          { error: 'Site manager not found. Please select a valid site manager.' },
          { status: 400 }
        );
      }
      
      if (manager.role !== 'site_manager') {
        return NextResponse.json(
          { error: 'Invalid site manager. Selected user must have site_manager role.' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (address) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (clientId !== undefined) updateData.clientId = clientId;
    if (client !== undefined) updateData.client = client;
    if (startDate) updateData.startDate = new Date(startDate);
    if (estimatedEndDate !== undefined) {
      updateData.estimatedEndDate = estimatedEndDate ? new Date(estimatedEndDate) : null;
    }
    if (actualEndDate !== undefined) {
      updateData.actualEndDate = actualEndDate ? new Date(actualEndDate) : null;
    }
    
    // Handle status and progress synchronization with validation
    if (status) {
      // Validation: Cannot set status to "on-hold" if progress is 100%
      if (status === 'on-hold' && existingSite.progress === 100) {
        return NextResponse.json(
          { error: 'Cannot set status to "on-hold" when progress is 100%. Please reduce progress first.' },
          { status: 400 }
        );
      }
      
      updateData.status = status;
      // If status is set to completed, automatically set progress to 100%
      if (status === 'completed') {
        updateData.progress = 100;
        updateData.progressUpdatedAt = new Date();
        // Set actual end date if not already set
        if (!actualEndDate && !existingSite.actualEndDate) {
          updateData.actualEndDate = new Date();
        }
      }
    }
    
    if (progress !== undefined) {
      // Validation: Cannot update progress if status is "on-hold"
      if (existingSite.status === 'on-hold') {
        return NextResponse.json(
          { error: 'Cannot update progress for sites that are on hold. Please change the site status first.' },
          { status: 400 }
        );
      }
      
      const clampedProgress = Math.min(100, Math.max(0, progress)); // Clamp between 0-100
      updateData.progress = clampedProgress;
      updateData.progressUpdatedAt = new Date();
      
      // If progress is set to 100%, automatically set status to completed
      if (clampedProgress === 100 && existingSite.status !== 'completed') {
        updateData.status = 'completed';
        // Set actual end date if not already set
        if (!existingSite.actualEndDate) {
          updateData.actualEndDate = new Date();
        }
      }
      // If progress is less than 100% and status was completed, change to active
      else if (clampedProgress < 100 && existingSite.status === 'completed') {
        updateData.status = 'active';
        // Clear actual end date since it's no longer completed
        updateData.actualEndDate = null;
      }
    }
    
    if (progressNotes !== undefined) updateData.progressNotes = progressNotes;
    if (siteManagerId !== undefined) {
      // Allow setting to null/empty to remove site manager
      updateData.siteManagerId = siteManagerId && siteManagerId.trim() !== '' ? siteManagerId : null;
    }
    if (description !== undefined) updateData.description = description;

    const site = await prisma.site.update({
      where: { id },
      data: updateData,
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

    // Fetch worker assignments from the Assignment table
    const uniqueWorkers = await prisma.assignment.findMany({
      where: {
        siteId: site.id,
        status: 'active',
      },
      select: {
        workerId: true,
        worker: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
      distinct: ['workerId'], // Get unique workers only
    });

    const workers = uniqueWorkers.map(assignment => assignment.worker);
    const assignmentCount = await prisma.assignment.count({
      where: {
        siteId: site.id,
        status: 'active',
      },
    });

    return NextResponse.json(
      { message: 'Site updated successfully', site: { ...site, workers, assignedWorkers: workers.length, totalAssignments: assignmentCount } },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating site:', error);
    
    // Handle Prisma specific errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A site with this information already exists' },
        { status: 409 }
      );
    }
    
    if (error.code === 'P2003') {
      // Foreign key constraint violation
      if (error.meta?.field_name?.includes('siteManagerId')) {
        return NextResponse.json(
          { error: 'Invalid site manager. The selected site manager does not exist or has been deleted.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid reference. One of the selected items does not exist.' },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }
    
    // Handle validation errors
    if (error.message?.includes('Invalid date')) {
      return NextResponse.json(
        { error: 'Invalid date format provided' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update site. Please check your input and try again.' },
      { status: 500 }
    );
  }
}

// DELETE site
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if site exists
    const existingSite = await prisma.site.findUnique({
      where: { id },
    });

    if (!existingSite) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Check if site has active assignments
    const activeAssignments = await prisma.assignment.count({
      where: {
        siteId: id,
        status: 'active',
      },
    });

    if (activeAssignments > 0) {
      return NextResponse.json(
        { error: 'Cannot delete site with active assignments. Please complete or remove assignments first.' },
        { status: 400 }
      );
    }

    await prisma.site.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Site deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting site:', error);
    
    // Handle Prisma specific errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete site. It is referenced by other records (assignments, etc.). Please remove related records first.' },
        { status: 400 }
      );
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete site. Please try again.' },
      { status: 500 }
    );
  }
}
