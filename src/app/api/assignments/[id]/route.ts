import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET single assignment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            status: true,
          },
        },
        worker: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            isLocked: true,
          },
        },
        car: {
          select: {
            id: true,
            name: true,
            number: true,
            color: true,
            model: true,
            status: true,
            isLocked: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ assignment }, { status: 200 });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment' },
      { status: 500 }
    );
  }
}

// PUT update assignment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { siteId, workerId, carId, assignedDate, status, notes } = body;

    console.log('PUT /api/assignments/[id] - Request body:', { id, siteId, workerId, carId, assignedDate, status, notes });

    // Check if assignment exists
    const existingAssignment = await prisma.assignment.findUnique({
      where: { id },
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Verify site if being updated
    if (siteId && siteId !== existingAssignment.siteId) {
      const site = await prisma.site.findUnique({
        where: { id: siteId },
      });

      if (!site) {
        return NextResponse.json(
          { error: 'Site not found' },
          { status: 404 }
        );
      }
    }

    // Verify worker if being updated
    if (workerId && workerId !== existingAssignment.workerId) {
      const worker = await prisma.users.findUnique({
        where: { id: workerId },
      });

      if (!worker || worker.role !== 'worker') {
        return NextResponse.json(
          { error: 'Worker not found or user does not have worker role' },
          { status: 404 }
        );
      }

      // Check if worker is locked - only reject if it's a NEW worker assignment
      if (worker.isLocked) {
        return NextResponse.json(
          { error: `Worker "${worker.fullName}" is locked and cannot be assigned. Please unlock the worker first.` },
          { status: 400 }
        );
      }

      // Enforce: worker cannot be on 2 different sites on the same date
      const targetDate = assignedDate
        ? new Date(assignedDate)
        : existingAssignment.assignedDate;
      const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const conflict = await prisma.assignment.findFirst({
        where: {
          workerId,
          status: 'active',
          assignedDate: { gte: dayStart, lt: dayEnd },
          siteId: { not: siteId ?? existingAssignment.siteId },
          id: { not: id },
        },
        include: { site: { select: { name: true } } },
      });

      if (conflict) {
        return NextResponse.json(
          { error: `Worker is already assigned to "${conflict.site.name}" on this date` },
          { status: 400 }
        );
      }
    } else if (workerId && workerId === existingAssignment.workerId) {
      // Same worker - always allow even if locked (they're already assigned)
      console.log('Keeping same worker in assignment, allowing even if locked');
    }

    // Verify car if being updated — only reject if it's a DIFFERENT locked car
    if (carId && carId !== existingAssignment.carId) {
      const car = await prisma.car.findUnique({ where: { id: carId } });
      if (!car) {
        return NextResponse.json({ error: 'Car not found' }, { status: 404 });
      }
      if (car.isLocked) {
        return NextResponse.json(
          { error: `Car "${car.name}" (${car.number}) is locked and cannot be assigned` },
          { status: 400 }
        );
      }
    }
    // Same car (or no car change) — always allow, even if locked

    const updateData: any = {};
    if (siteId !== undefined) updateData.siteId = siteId;
    if (workerId !== undefined) updateData.workerId = workerId;
    if (carId !== undefined) updateData.carId = carId;
    if (assignedDate !== undefined) updateData.assignedDate = new Date(assignedDate);
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const assignment = await prisma.assignment.update({
      where: { id },
      data: updateData,
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            status: true,
          },
        },
        worker: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            role: true,
            isLocked: true,
          },
        },
        car: {
          select: {
            id: true,
            name: true,
            number: true,
            color: true,
            model: true,
            status: true,
            isLocked: true,
          },
        },
      },
    });

    console.log('Assignment updated successfully:', assignment.id);

    return NextResponse.json(
      { message: 'Assignment updated successfully', assignment },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update assignment' },
      { status: 500 }
    );
  }
}

// DELETE assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if assignment exists and get worker and car info
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        worker: {
          select: {
            id: true,
            fullName: true,
            isLocked: true,
          },
        },
        car: {
          select: {
            id: true,
            name: true,
            number: true,
            isLocked: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Delete the assignment
    await prisma.assignment.delete({
      where: { id },
    });

    let workerUnlocked = false;
    let carUnlocked = false;

    // If the worker was locked, unlock them since they're no longer assigned
    if (assignment.worker.isLocked) {
      await prisma.users.update({
        where: { id: assignment.workerId },
        data: { isLocked: false },
      });
      workerUnlocked = true;
      console.log(`Worker "${assignment.worker.fullName}" unlocked after assignment deletion`);
    }

    // If the car was locked, unlock it since it's no longer assigned
    if (assignment.car && assignment.car.isLocked) {
      await prisma.car.update({
        where: { id: assignment.carId! },
        data: { isLocked: false },
      });
      carUnlocked = true;
      console.log(`Car "${assignment.car.name}" (${assignment.car.number}) unlocked after assignment deletion`);
    }

    return NextResponse.json(
      { 
        message: 'Assignment deleted successfully',
        workerUnlocked,
        workerName: assignment.worker.fullName,
        carUnlocked,
        carName: assignment.car ? `${assignment.car.name} (${assignment.car.number})` : null
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}
