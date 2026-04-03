import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Bulk delete assignments by site ID and date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, assignedDate, assignmentIds } = body;

    console.log('POST /api/assignments/bulk-delete - Request body:', { 
      siteId, 
      assignedDate, 
      assignmentIds: assignmentIds?.length || 'not provided' 
    });

    // Option 1: Delete by specific assignment IDs
    if (assignmentIds && Array.isArray(assignmentIds) && assignmentIds.length > 0) {
      console.log(`Deleting ${assignmentIds.length} specific assignments...`);
      
      // Get assignment info before deletion (for unlocking workers and cars)
      const assignmentsToDelete = await prisma.assignment.findMany({
        where: { id: { in: assignmentIds } },
        include: { 
          worker: { select: { id: true, fullName: true, isLocked: true } },
          car: { select: { id: true, name: true, number: true, isLocked: true } },
          site: { select: { name: true } }
        },
      });

      if (assignmentsToDelete.length === 0) {
        return NextResponse.json(
          { error: 'No assignments found with the provided IDs' },
          { status: 404 }
        );
      }

      // Delete assignments
      const deleteResult = await prisma.assignment.deleteMany({
        where: { id: { in: assignmentIds } },
      });

      // Unlock workers who were locked
      const workersToUnlock = assignmentsToDelete
        .filter(a => a.worker.isLocked)
        .map(a => a.worker.id);

      let unlockedWorkersCount = 0;
      if (workersToUnlock.length > 0) {
        const unlockResult = await prisma.users.updateMany({
          where: { id: { in: workersToUnlock } },
          data: { isLocked: false },
        });
        unlockedWorkersCount = unlockResult.count;
      }

      // Unlock cars that were locked
      const carsToUnlock = assignmentsToDelete
        .filter(a => a.car && a.car.isLocked)
        .map(a => a.car!.id);

      let unlockedCarsCount = 0;
      if (carsToUnlock.length > 0) {
        const unlockResult = await prisma.car.updateMany({
          where: { id: { in: carsToUnlock } },
          data: { isLocked: false },
        });
        unlockedCarsCount = unlockResult.count;
      }

      console.log(`Bulk delete completed: deleted ${deleteResult.count} assignments, unlocked ${unlockedWorkersCount} workers, unlocked ${unlockedCarsCount} cars`);

      return NextResponse.json({
        message: 'Assignments deleted successfully',
        deletedCount: deleteResult.count,
        unlockedWorkers: unlockedWorkersCount,
        unlockedCars: unlockedCarsCount,
        siteName: assignmentsToDelete[0]?.site?.name || 'Unknown',
      });
    }

    // Option 2: Delete by site ID and date
    if (siteId && assignedDate) {
      console.log(`Deleting all assignments for site ${siteId} on date ${assignedDate}...`);
      
      const assignmentDate = new Date(assignedDate);
      const startOfDay = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Get assignments to delete (for unlocking workers and cars)
      const assignmentsToDelete = await prisma.assignment.findMany({
        where: {
          siteId,
          assignedDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
        include: { 
          worker: { select: { id: true, fullName: true, isLocked: true } },
          car: { select: { id: true, name: true, number: true, isLocked: true } },
          site: { select: { name: true } }
        },
      });

      if (assignmentsToDelete.length === 0) {
        return NextResponse.json(
          { error: 'No assignments found for the specified site and date' },
          { status: 404 }
        );
      }

      // Delete assignments
      const deleteResult = await prisma.assignment.deleteMany({
        where: {
          siteId,
          assignedDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });

      // Unlock workers who were locked
      const workersToUnlock = assignmentsToDelete
        .filter(a => a.worker.isLocked)
        .map(a => a.worker.id);

      let unlockedWorkersCount = 0;
      if (workersToUnlock.length > 0) {
        const unlockResult = await prisma.users.updateMany({
          where: { id: { in: workersToUnlock } },
          data: { isLocked: false },
        });
        unlockedWorkersCount = unlockResult.count;
      }

      // Unlock cars that were locked
      const carsToUnlock = assignmentsToDelete
        .filter(a => a.car && a.car.isLocked)
        .map(a => a.car!.id);

      let unlockedCarsCount = 0;
      if (carsToUnlock.length > 0) {
        const unlockResult = await prisma.car.updateMany({
          where: { id: { in: carsToUnlock } },
          data: { isLocked: false },
        });
        unlockedCarsCount = unlockResult.count;
      }

      console.log(`Bulk delete completed: deleted ${deleteResult.count} assignments, unlocked ${unlockedWorkersCount} workers, unlocked ${unlockedCarsCount} cars`);

      return NextResponse.json({
        message: 'Site assignments deleted successfully',
        deletedCount: deleteResult.count,
        unlockedWorkers: unlockedWorkersCount,
        unlockedCars: unlockedCarsCount,
        siteName: assignmentsToDelete[0]?.site?.name || 'Unknown',
      });
    }

    // Option 3: Delete by site ID only (all assignments for that site)
    if (siteId) {
      console.log(`Deleting ALL assignments for site ${siteId}...`);
      
      // Get assignments to delete (for unlocking workers and cars)
      const assignmentsToDelete = await prisma.assignment.findMany({
        where: { siteId },
        include: { 
          worker: { select: { id: true, fullName: true, isLocked: true } },
          car: { select: { id: true, name: true, number: true, isLocked: true } },
          site: { select: { name: true } }
        },
      });

      if (assignmentsToDelete.length === 0) {
        return NextResponse.json(
          { error: 'No assignments found for the specified site' },
          { status: 404 }
        );
      }

      // Delete assignments
      const deleteResult = await prisma.assignment.deleteMany({
        where: { siteId },
      });

      // Unlock workers who were locked
      const workersToUnlock = assignmentsToDelete
        .filter(a => a.worker.isLocked)
        .map(a => a.worker.id);

      let unlockedWorkersCount = 0;
      if (workersToUnlock.length > 0) {
        const unlockResult = await prisma.users.updateMany({
          where: { id: { in: workersToUnlock } },
          data: { isLocked: false },
        });
        unlockedWorkersCount = unlockResult.count;
      }

      // Unlock cars that were locked
      const carsToUnlock = assignmentsToDelete
        .filter(a => a.car && a.car.isLocked)
        .map(a => a.car!.id);

      let unlockedCarsCount = 0;
      if (carsToUnlock.length > 0) {
        const unlockResult = await prisma.car.updateMany({
          where: { id: { in: carsToUnlock } },
          data: { isLocked: false },
        });
        unlockedCarsCount = unlockResult.count;
      }

      console.log(`Bulk delete completed: deleted ${deleteResult.count} assignments, unlocked ${unlockedWorkersCount} workers, unlocked ${unlockedCarsCount} cars`);

      return NextResponse.json({
        message: 'All site assignments deleted successfully',
        deletedCount: deleteResult.count,
        unlockedWorkers: unlockedWorkersCount,
        unlockedCars: unlockedCarsCount,
        siteName: assignmentsToDelete[0]?.site?.name || 'Unknown',
      });
    }

    // No valid parameters provided
    return NextResponse.json(
      { error: 'Either assignmentIds array, or siteId (with optional assignedDate) is required' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('Bulk delete assignments error:', error);
    return NextResponse.json(
      { error: 'Failed to delete assignments', details: error.message },
      { status: 500 }
    );
  }
}