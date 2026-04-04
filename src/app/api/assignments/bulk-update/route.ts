import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/assignments/bulk-update
 * Replaces all assignments for a site/date with a new worker list.
 * Intelligently unlocks workers/cars that are no longer assigned.
 * If the same car is kept, the lock check is skipped.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, workerIds, carId, assignedDate, notes, originalAssignmentIds } = body;

    if (!siteId || !Array.isArray(workerIds) || workerIds.length === 0 || !assignedDate) {
      return NextResponse.json(
        { error: 'siteId, workerIds (array), and assignedDate are required' },
        { status: 400 }
      );
    }

    // Verify site
    const site = await prisma.site.findUnique({ where: { id: siteId } });
    if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

    // Verify workers
    const workers = await prisma.users.findMany({
      where: { id: { in: workerIds }, role: 'worker' },
    });
    if (workers.length !== workerIds.length) {
      const missing = workerIds.filter((id: string) => !workers.find(w => w.id === id));
      return NextResponse.json(
        { error: `Workers not found or missing worker role: ${missing.join(', ')}` },
        { status: 404 }
      );
    }

    // Resolve which assignments to replace
    const d = new Date(assignedDate);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000);

    const idsToDelete: string[] = originalAssignmentIds?.length
      ? originalAssignmentIds
      : (await prisma.assignment.findMany({
          where: { siteId, assignedDate: { gte: startOfDay, lt: endOfDay } },
          select: { id: true },
        })).map((a: { id: string }) => a.id);

    // Fetch originals early — needed for car same-check and unlock logic
    const originals = await prisma.assignment.findMany({
      where: { id: { in: idsToDelete } },
      include: {
        worker: { select: { id: true, isLocked: true } },
        car: { select: { id: true, isLocked: true } },
      },
    });

    // Verify car — skip lock check if it's the same car already on the assignment
    if (carId) {
      const existingCarIds = originals.map(a => a.carId).filter(Boolean);
      const isSameCar = existingCarIds.length > 0 && existingCarIds.every(id => id === carId);
      if (!isSameCar) {
        const car = await prisma.car.findUnique({ where: { id: carId } });
        if (!car) return NextResponse.json({ error: 'Car not found' }, { status: 404 });
        if (car.isLocked) {
          return NextResponse.json(
            { error: `Car "${car.name}" (${car.number}) is locked and cannot be assigned` },
            { status: 400 }
          );
        }
      }
    }

    // Check locked workers — allow if already in the assignments being replaced
    const lockedWorkers = workers.filter(w => w.isLocked);
    if (lockedWorkers.length > 0) {
      const existingWorkerIds = originals.map(a => a.workerId);
      const newLocked = lockedWorkers.filter(w => !existingWorkerIds.includes(w.id));
      if (newLocked.length > 0) {
        return NextResponse.json(
          { error: `Locked workers cannot be newly assigned: ${newLocked.map(w => w.fullName).join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Delete originals
    await prisma.assignment.deleteMany({ where: { id: { in: idsToDelete } } });

    // Unlock workers removed from assignment
    const workerIdsToUnlock = originals
      .filter(a => a.worker.isLocked && !workerIds.includes(a.worker.id))
      .map(a => a.worker.id);
    if (workerIdsToUnlock.length > 0) {
      await prisma.users.updateMany({ where: { id: { in: workerIdsToUnlock } }, data: { isLocked: false } });
    }

    // Unlock cars replaced by a different car
    const carIdsToUnlock = [...new Set(
      originals.filter(a => a.car?.isLocked && a.car.id !== carId).map(a => a.car!.id)
    )];
    if (carIdsToUnlock.length > 0) {
      await prisma.car.updateMany({ where: { id: { in: carIdsToUnlock } }, data: { isLocked: false } });
    }

    // Create new assignments
    await prisma.assignment.createMany({
      data: workerIds.map((workerId: string) => ({
        siteId,
        workerId,
        carId: carId || null,
        assignedDate: new Date(assignedDate),
        status: 'active',
        notes: notes || null,
      })),
    });

    return NextResponse.json({
      message: 'Assignments updated successfully',
      deletedCount: idsToDelete.length,
      createdCount: workerIds.length,
      unlockedWorkers: workerIdsToUnlock.length,
      unlockedCars: carIdsToUnlock.length,
    });
  } catch (error: any) {
    console.error('Bulk assignment update error:', error);
    return NextResponse.json({ error: 'Failed to update assignments' }, { status: 500 });
  }
}
