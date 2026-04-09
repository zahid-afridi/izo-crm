import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Create new assignment(s) - accepts array of worker IDs
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, workerIds, assignedDate, status, notes, carId } = body;

    console.log('POST /api/assignments - Request body:', { siteId, workerIds, assignedDate, status, notes, carId });
    console.log('Worker IDs to check:', workerIds);

    // Validate required fields
    if (!siteId || !workerIds || !Array.isArray(workerIds) || workerIds.length === 0 || !assignedDate) {
      return NextResponse.json(
        { error: 'siteId, workerIds (array), and assignedDate are required' },
        { status: 400 }
      );
    }

    // Filter out invalid UUIDs (basic UUID format check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const validWorkerIds = workerIds.filter(id => uuidRegex.test(id));
    const invalidWorkerIds = workerIds.filter(id => !uuidRegex.test(id));

    if (invalidWorkerIds.length > 0) {
      console.log('Invalid worker IDs found:', invalidWorkerIds);
    }

    if (validWorkerIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid worker IDs provided' },
        { status: 400 }
      );
    }

    console.log('Valid worker IDs:', validWorkerIds);

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

    // Verify all workers exist and are not locked
    // Only allow users with 'worker' role to be assigned
    console.log('Searching for workers with valid IDs:', validWorkerIds);
    
    const workers = await prisma.users.findMany({
      where: { 
        id: { in: validWorkerIds },
        role: 'worker' // Only workers can be assigned
      },
    });

    console.log('Found workers:', workers.map(w => ({ id: w.id, fullName: w.fullName, role: w.role })));

    // Check if all valid workers were found
    if (workers.length !== validWorkerIds.length) {
      const foundWorkerIds = workers.map(w => w.id);
      const missingWorkerIds = validWorkerIds.filter(id => !foundWorkerIds.includes(id));
      
      console.log('Missing worker IDs:', missingWorkerIds);
      console.log('Found worker IDs:', foundWorkerIds);
      
      let errorMessage = `Users not found or do not have worker role: ${missingWorkerIds.join(', ')}. Only users with 'worker' role can be assigned.`;
      
      if (invalidWorkerIds.length > 0) {
        errorMessage += ` Invalid IDs were filtered out: ${invalidWorkerIds.join(', ')}`;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }

    // Check for locked workers - for CREATE operations, allow locked workers who are already assigned to this site/date
    const lockedWorkers = workers.filter(w => w.isLocked);
    if (lockedWorkers.length > 0) {
      // For CREATE operations, check if locked workers are already assigned to this site/date
      const assignmentDate = new Date(assignedDate);
      const startOfDay = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const existingAssignments = await prisma.assignment.findMany({
        where: {
          siteId,
          workerId: { in: lockedWorkers.map(w => w.id) },
          assignedDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
        select: { workerId: true },
      });

      const alreadyAssignedWorkerIds = existingAssignments.map(a => a.workerId);
      
      // Only reject locked workers who are NOT already assigned to this site/date
      const newLockedWorkers = lockedWorkers.filter(w => !alreadyAssignedWorkerIds.includes(w.id));
      
      if (newLockedWorkers.length > 0) {
        const lockedWorkerNames = newLockedWorkers.map(w => w.fullName).join(', ');
        return NextResponse.json(
          { 
            error: `The following workers are locked and cannot be assigned: ${lockedWorkerNames}. Please unlock them first.`,
            lockedWorkers: newLockedWorkers.map(w => ({ id: w.id, name: w.fullName }))
          },
          { status: 400 }
        );
      }
      
      console.log(`Allowing ${lockedWorkers.length - newLockedWorkers.length} locked workers who are already assigned to this site/date`);
    }

    // Check if any workers are on day-off for this date
    const assignmentDate = new Date(assignedDate);
    assignmentDate.setHours(0, 0, 0, 0);
    
    const dailyProgram = await prisma.dailyProgram.findUnique({
      where: { date: assignmentDate },
      select: { workersOnDayOff: true },
    });

    if (dailyProgram && dailyProgram.workersOnDayOff && dailyProgram.workersOnDayOff.length > 0) {
      const workersOnDayOff = workers.filter(w => dailyProgram.workersOnDayOff.includes(w.id));
      
      if (workersOnDayOff.length > 0) {
        const dayOffWorkerNames = workersOnDayOff.map(w => w.fullName).join(', ');
        return NextResponse.json(
          { 
            error: `The following workers are on day-off and cannot be assigned: ${dayOffWorkerNames}. Please remove them from day-off first.`,
            workersOnDayOff: workersOnDayOff.map(w => ({ id: w.id, name: w.fullName }))
          },
          { status: 400 }
        );
      }
    }

    // Enforce: a worker cannot be assigned to 2 sites on the same date
    const assignmentDateStart = new Date(assignedDate);
    assignmentDateStart.setHours(0, 0, 0, 0);
    const assignmentDateEnd = new Date(assignmentDateStart.getTime() + 24 * 60 * 60 * 1000);

    const existingOnDate = await prisma.assignment.findMany({
      where: {
        workerId: { in: validWorkerIds },
        status: 'active',
        assignedDate: { gte: assignmentDateStart, lt: assignmentDateEnd },
        siteId: { not: siteId }, // different site = conflict
      },
      include: {
        worker: { select: { id: true, fullName: true } },
        site: { select: { name: true } },
      },
    });

    if (existingOnDate.length > 0) {
      const conflicts = existingOnDate.map(
        (a) => `${a.worker.fullName} is already assigned to "${a.site.name}" on this date`
      );
      return NextResponse.json(
        { error: `Cannot assign workers to multiple sites on the same date: ${conflicts.join('; ')}` },
        { status: 400 }
      );
    }

    // If carId provided, verify car exists and is not locked
    let car = null;
    if (carId) {
      car = await prisma.car.findUnique({
        where: { id: carId },
      });

      if (!car) {
        return NextResponse.json(
          { error: 'Car not found' },
          { status: 404 }
        );
      }

      // Check if car is locked
      if (car.isLocked) {
        return NextResponse.json(
          { error: `Car "${car.name}" (${car.number}) is locked and cannot be assigned` },
          { status: 400 }
        );
      }
    }

    // Create assignments for all workers
    const assignmentData = validWorkerIds.map(workerId => ({
      siteId,
      workerId,
      carId: carId || null,
      assignedDate: new Date(assignedDate),
      status: status || 'active',
      notes: notes || null,
    }));

    // For single worker, use create for better response. For multiple, use createMany
    if (validWorkerIds.length === 1) {
      // Single worker - return full assignment details
      const assignment = await prisma.assignment.create({
        data: assignmentData[0],
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

      // Create notification for the assigned worker
      await prisma.notification.create({
        data: {
          userId: assignment.workerId,
          title: 'New assignment',
          message: `You have been assigned to ${assignment.site.name} on ${assignment.assignedDate.toLocaleDateString()}.`,
          module: 'assignments',
          type: 'assignment_assigned',
          data: {
            assignmentId: assignment.id,
            siteId: assignment.siteId,
            siteName: assignment.site.name,
            assignedDate: assignment.assignedDate,
          },
        },
      });

      console.log('Single assignment created successfully:', assignment.id);

      return NextResponse.json(
        { message: 'Assignment created successfully', assignment, count: 1 },
        { status: 201 }
      );
    } else {
      // Multiple workers - create assignments and notifications
      const createdAssignments = await prisma.$transaction(async (tx) => {
        const created = await Promise.all(
          assignmentData.map(data => tx.assignment.create({ data }))
        );

        await tx.notification.createMany({
          data: created.map(a => ({
            userId: a.workerId,
            title: 'New assignment',
            message: `You have been assigned to ${site.name} on ${a.assignedDate.toLocaleDateString()}.`,
            module: 'assignments',
            type: 'assignment_assigned',
            data: {
              assignmentId: a.id,
              siteId: a.siteId,
              assignedDate: a.assignedDate,
            },
          })),
        });

        return created;
      });

      // Fetch the created assignments with full details
      const createdAssignmentsDetailed = await prisma.assignment.findMany({
        where: {
          id: { in: createdAssignments.map(a => a.id) },
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
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log(`${createdAssignments.length} assignments created successfully for site: ${site.name}`);

      return NextResponse.json(
        { 
          message: `${createdAssignments.length} assignments created successfully`,
          count: createdAssignments.length,
          assignments: createdAssignmentsDetailed,
          site: {
            id: site.id,
            name: site.name
          },
          workers: workers.map(w => ({
            id: w.id,
            name: w.fullName
          }))
        },
        { status: 201 }
      );
    }
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
}