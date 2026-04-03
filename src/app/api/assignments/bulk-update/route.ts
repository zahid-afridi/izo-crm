import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Bulk update assignments (replaces all assignments for a site/date with new worker list)
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { siteId, workerIds, carId, assignedDate, notes, originalAssignmentIds } = body;

  console.log('POST /api/assignments/bulk-update - Request body:', { 
    siteId, 
    workerIds: workerIds.length, 
    carId, 
    assignedDate, 
    notes, 
    originalAssignmentIds: originalAssignmentIds?.length || 'auto-detect' 
  });

  // Validate required fields
  if (!siteId || !workerIds || !Array.isArray(workerIds) || workerIds.length === 0 || !assignedDate) {
    return NextResponse.json(
      { error: 'siteId, workerIds (array), and assignedDate are required' },
      { status: 400 }
    );
  }

  // If originalAssignmentIds not provided, find existing assignments for this site and date
  let assignmentIdsToDelete = originalAssignmentIds;
  
  if (!assignmentIdsToDelete || assignmentIdsToDelete.length === 0) {
    console.log('originalAssignmentIds not provided, auto-detecting existing assignments...');
    
    const assignmentDate = new Date(assignedDate);
    const startOfDay = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const existingAssignments = await prisma.assignment.findMany({
      where: {
        siteId,
        assignedDate: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      select: { id: true },
    });

    assignmentIdsToDelete = existingAssignments.map(a => a.id);
    console.log(`Auto-detected ${assignmentIdsToDelete.length} existing assignments to replace`);
  }

  try {

    // Verify site exists
    const site = await prisma.site.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    // Verify all workers exist, have worker role, and are not locked
    const workers = await prisma.users.findMany({
      where: { 
        id: { in: workerIds },
        role: 'worker'
      },
    });

    // Check if all workers were found
    if (workers.length !== workerIds.length) {
      const foundWorkerIds = workers.map(w => w.id);
      const missingWorkerIds = workerIds.filter(id => !foundWorkerIds.includes(id));
      return NextResponse.json(
        { error: `Workers not found or do not have worker role: ${missingWorkerIds.join(', ')}` },
        { status: 404 }
      );
    }

    // Check for locked workers - but allow workers who are already assigned to this site/date OR are being updated from existing assignments
    const lockedWorkers = workers.filter(w => w.isLocked);
    if (lockedWorkers.length > 0) {
      // Get existing assignments for this site and date to check if locked workers are already assigned
      const assignmentDate = new Date(assignedDate);
      const startOfDay = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const existingAssignments = await prisma.assignment.findMany({
        where: {
          siteId,
          assignedDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
        select: { workerId: true },
      });

      const existingWorkerIds = existingAssignments.map(a => a.workerId);
      
      // Also get workers from the original assignments being updated (if provided)
      let originalWorkerIds: string[] = [];
      if (assignmentIdsToDelete && assignmentIdsToDelete.length > 0) {
        const originalAssignments = await prisma.assignment.findMany({
          where: { id: { in: assignmentIdsToDelete } },
          select: { workerId: true },
        });
        originalWorkerIds = originalAssignments.map(a => a.workerId);
      }
      
      // Combine existing workers and original workers being updated
      const allowedWorkerIds = [...new Set([...existingWorkerIds, ...originalWorkerIds])];
      
      // Only reject locked workers who are NOT already assigned to this site/date AND are NOT being updated from existing assignments
      const newLockedWorkers = lockedWorkers.filter(w => !allowedWorkerIds.includes(w.id));
      
      if (newLockedWorkers.length > 0) {
        const lockedNames = newLockedWorkers.map(w => w.fullName).join(', ');
        return NextResponse.json(
          { error: `The following workers are locked and cannot be assigned: ${lockedNames}. Please unlock them first.` },
          { status: 400 }
        );
      }
      
      console.log(`Allowing ${lockedWorkers.length - newLockedWorkers.length} locked workers who are already assigned or being updated from existing assignments`);
    }

    // Verify car if provided
    if (carId) {
      const car = await prisma.car.findUnique({
        where: { id: carId },
      });

      if (!car) {
        return NextResponse.json(
          { error: 'Car not found' },
          { status: 404 }
        );
      }

      if (car.isLocked) {
        return NextResponse.json(
          { error: `Car "${car.name}" (${car.number}) is locked and cannot be assigned` },
          { status: 400 }
        );
      }
    }

    // Note: Workers can be assigned to multiple sites on the same date
    // No restriction on duplicate assignments - this is allowed by business logic

    // Use transaction to ensure atomicity with increased timeout
    console.log('Starting bulk update transaction...');
    const result = await prisma.$transaction(async (tx) => {
      console.log('Step 1: Getting original assignments...');
      // 1. Get original assignments info before deletion (for unlocking workers and cars)
      const originalAssignments = await tx.assignment.findMany({
        where: { id: { in: assignmentIdsToDelete } },
        include: { 
          worker: { select: { id: true, fullName: true, isLocked: true } },
          car: { select: { id: true, name: true, number: true, isLocked: true } }
        },
      });

      console.log('Step 2: Deleting original assignments...');
      // 2. Delete original assignments
      const deleteResult = await tx.assignment.deleteMany({
        where: { id: { in: assignmentIdsToDelete } },
      });

      console.log('Step 3: Unlocking workers and cars (only those not being reassigned)...');
      // 3. Unlock workers from original assignments ONLY if they are NOT in the new worker list
      const workersToUnlock = originalAssignments
        .filter(a => a.worker.isLocked && !workerIds.includes(a.worker.id)) // Only unlock if not being reassigned
        .map(a => a.worker.id);

      let unlockedWorkersCount = 0;
      if (workersToUnlock.length > 0) {
        const unlockResult = await tx.users.updateMany({
          where: { id: { in: workersToUnlock } },
          data: { isLocked: false },
        });
        unlockedWorkersCount = unlockResult.count;
        console.log(`Unlocked ${unlockedWorkersCount} workers who were removed from assignments`);
      }

      // 4. Unlock cars from original assignments ONLY if a different car is being assigned
      const carsToUnlock = originalAssignments
        .filter(a => a.car && a.car.isLocked && a.car.id !== carId) // Only unlock if different car is being used
        .map(a => a.car!.id);

      let unlockedCarsCount = 0;
      if (carsToUnlock.length > 0) {
        const unlockResult = await tx.car.updateMany({
          where: { id: { in: carsToUnlock } },
          data: { isLocked: false },
        });
        unlockedCarsCount = unlockResult.count;
        console.log(`Unlocked ${unlockedCarsCount} cars that were replaced`);
      }

      console.log('Step 4: Creating new assignments...');
      // 4. Create new assignments in batch (more efficient than Promise.all)
      const assignmentData = workerIds.map((workerId: string) => ({
        siteId,
        workerId,
        carId: carId || null,
        assignedDate: new Date(assignedDate),
        status: 'active',
        notes: notes || null,
      }));

      // Use createMany for better performance
      const createResult = await tx.assignment.createMany({
        data: assignmentData,
      });

      console.log('Step 5: Fetching created assignments...');
      // Get the created assignments with relations for response
      const newAssignments = await tx.assignment.findMany({
        where: {
          siteId,
          workerId: { in: workerIds },
          assignedDate: {
            gte: new Date(assignedDate),
            lt: new Date(new Date(assignedDate).getTime() + 24 * 60 * 60 * 1000),
          },
        },
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

      console.log('Transaction completed successfully');
      return {
        deletedCount: deleteResult.count,
        createdCount: createResult.count,
        unlockedWorkers: unlockedWorkersCount,
        unlockedCars: unlockedCarsCount,
        assignments: newAssignments,
      };
    }, {
      timeout: 15000, // Increase timeout to 15 seconds
    });

    console.log(`Bulk update completed: deleted ${result.deletedCount}, created ${result.createdCount}, unlocked ${result.unlockedWorkers} workers, unlocked ${result.unlockedCars} cars`);

    return NextResponse.json(
      { 
        message: 'Assignments updated successfully',
        ...result
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Bulk assignment update error:', error);
    
    // If it's a transaction timeout, try a simpler approach without transaction
    if (error.code === 'P2028' || error.message.includes('timeout')) {
      console.log('Transaction timeout detected, trying simpler approach...');
      
      try {
        // Simple approach: Delete then create (without transaction)
        console.log('Step 1: Getting original assignments for unlocking...');
        // Get assignment info before deletion (for unlocking workers and cars)
        const originalAssignments = await prisma.assignment.findMany({
          where: { id: { in: assignmentIdsToDelete } },
          include: { 
            worker: { select: { id: true, fullName: true, isLocked: true } },
            car: { select: { id: true, name: true, number: true, isLocked: true } }
          },
        });

        console.log('Step 2: Deleting original assignments...');
        const deleteResult = await prisma.assignment.deleteMany({
          where: { id: { in: assignmentIdsToDelete } },
        });

        console.log('Step 3: Unlocking workers and cars (only those not being reassigned)...');
        // Unlock workers from original assignments ONLY if they are NOT in the new worker list
        const workersToUnlock = originalAssignments
          .filter(a => a.worker.isLocked && !workerIds.includes(a.worker.id)) // Only unlock if not being reassigned
          .map(a => a.worker.id);

        let unlockedWorkersCount = 0;
        if (workersToUnlock.length > 0) {
          const unlockResult = await prisma.users.updateMany({
            where: { id: { in: workersToUnlock } },
            data: { isLocked: false },
          });
          unlockedWorkersCount = unlockResult.count;
          console.log(`Unlocked ${unlockedWorkersCount} workers who were removed from assignments`);
        }

        // Unlock cars from original assignments ONLY if a different car is being assigned
        const carsToUnlock = originalAssignments
          .filter(a => a.car && a.car.isLocked && a.car.id !== carId) // Only unlock if different car is being used
          .map(a => a.car!.id);

        let unlockedCarsCount = 0;
        if (carsToUnlock.length > 0) {
          const unlockResult = await prisma.car.updateMany({
            where: { id: { in: carsToUnlock } },
            data: { isLocked: false },
          });
          unlockedCarsCount = unlockResult.count;
          console.log(`Unlocked ${unlockedCarsCount} cars that were replaced`);
        }

        console.log('Step 4: Creating new assignments...');
        const assignmentData = workerIds.map((workerId: string) => ({
          siteId,
          workerId,
          carId: carId || null,
          assignedDate: new Date(assignedDate),
          status: 'active',
          notes: notes || null,
        }));

        const createResult = await prisma.assignment.createMany({
          data: assignmentData,
        });

        console.log(`Simple approach completed successfully: deleted ${deleteResult.count}, created ${createResult.count}, unlocked ${unlockedWorkersCount} workers, unlocked ${unlockedCarsCount} cars`);
        
        return NextResponse.json(
          { 
            message: 'Assignments updated successfully (simple approach)',
            deletedCount: deleteResult.count,
            createdCount: createResult.count,
            unlockedWorkers: unlockedWorkersCount,
            unlockedCars: unlockedCarsCount,
          },
          { status: 200 }
        );
        
      } catch (simpleError: any) {
        console.error('Simple approach also failed:', simpleError);
        return NextResponse.json(
          { error: 'Failed to update assignments (both transaction and simple approach failed)', details: simpleError.message },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update assignments', details: error.message },
      { status: 500 }
    );
  }
}