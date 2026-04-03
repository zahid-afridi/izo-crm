import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Bulk lock/unlock workers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workerIds, isLocked, updatedByUserId } = body;

    console.log('POST /api/workers/bulk-lock - Request body:', { workerIds, isLocked, updatedByUserId });

    // Validate required fields
    if (!workerIds || !Array.isArray(workerIds) || workerIds.length === 0) {
      return NextResponse.json(
        { error: 'workerIds array is required and cannot be empty' },
        { status: 400 }
      );
    }

    if (typeof isLocked !== 'boolean') {
      return NextResponse.json(
        { error: 'isLocked must be a boolean value' },
        { status: 400 }
      );
    }

    // Remove duplicates and filter out invalid IDs
    const uniqueWorkerIds = [...new Set(workerIds)].filter(id => id && typeof id === 'string' && id.trim() !== '');
    
    if (uniqueWorkerIds.length === 0) {
      return NextResponse.json(
        { error: 'No valid worker IDs provided' },
        { status: 400 }
      );
    }

    console.log(`Processing ${uniqueWorkerIds.length} unique worker IDs (${workerIds.length - uniqueWorkerIds.length} duplicates removed)`);

    // Verify all workers exist and have worker role
    const workers = await prisma.users.findMany({
      where: { 
        id: { in: uniqueWorkerIds },
        role: 'worker'
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isLocked: true,
      },
    });

    // Check if all workers were found
    if (workers.length !== uniqueWorkerIds.length) {
      const foundWorkerIds = workers.map(w => w.id);
      const missingWorkerIds = uniqueWorkerIds.filter(id => !foundWorkerIds.includes(id));
      
      console.error('Workers not found or invalid role:', missingWorkerIds);
      
      return NextResponse.json(
        { 
          error: `${missingWorkerIds.length} workers not found or do not have worker role`,
          details: {
            requested: uniqueWorkerIds.length,
            found: workers.length,
            missing: missingWorkerIds.length,
            missingIds: missingWorkerIds.slice(0, 5) // Show first 5 for debugging
          }
        },
        { status: 404 }
      );
    }

    // Filter workers that actually need to be updated (avoid unnecessary updates)
    const workersToUpdate = workers.filter(w => w.isLocked !== isLocked);
    
    if (workersToUpdate.length === 0) {
      return NextResponse.json(
        { 
          message: `All workers are already ${isLocked ? 'locked' : 'unlocked'}`,
          updated: 0,
          workers: workers.map(w => ({
            id: w.id,
            name: w.fullName,
            wasAlreadyInDesiredState: true
          }))
        },
        { status: 200 }
      );
    }

    // Perform bulk update
    const updateResult = await prisma.$transaction(async (tx) => {
      // Update all workers in a single query
      const updateResponse = await tx.users.updateMany({
        where: {
          id: { in: workersToUpdate.map(w => w.id) }
        },
        data: {
          isLocked: isLocked
        }
      });

      // Log activity for each worker if updatedByUserId is provided and valid
      if (updatedByUserId && updatedByUserId !== 'system') {
        try {
          // Verify the user exists before creating activity logs
          const userExists = await tx.users.findUnique({
            where: { id: updatedByUserId },
            select: { id: true }
          });

          if (userExists) {
            const ipAddress = request.headers.get('x-forwarded-for') || 
                             request.headers.get('x-real-ip') || 
                             'Unknown';
            const userAgent = request.headers.get('user-agent') || 'Unknown';

            // Create activity logs for all updated workers
            const activityLogs = workersToUpdate.map(worker => ({
              userId: updatedByUserId,
              action: isLocked ? 'lock' : 'unlock',
              module: 'Workers',
              description: `${isLocked ? 'Locked' : 'Unlocked'} worker "${worker.fullName}"`,
              entityId: worker.id,
              entityType: 'Worker',
              ipAddress,
              userAgent,
              oldValues: {
                isLocked: !isLocked
              },
              newValues: {
                isLocked: isLocked
              },
            }));

            await tx.activityLog.createMany({
              data: activityLogs
            });

            console.log(`Activity logs created for ${activityLogs.length} workers`);
          } else {
            console.warn(`User ${updatedByUserId} not found, skipping activity logging`);
          }
        } catch (logError) {
          console.error('Error logging bulk activity:', logError);
          // Don't fail the update if activity logging fails
        }
      } else {
        console.log('Skipping activity logging - no valid user ID provided');
      }

      return updateResponse;
    });

    console.log(`Bulk ${isLocked ? 'locked' : 'unlocked'} ${updateResult.count} workers successfully`);

    return NextResponse.json(
      { 
        message: `${updateResult.count} workers ${isLocked ? 'locked' : 'unlocked'} successfully`,
        updated: updateResult.count,
        total: uniqueWorkerIds.length,
        action: isLocked ? 'locked' : 'unlocked',
        workers: workersToUpdate.map(w => ({
          id: w.id,
          name: w.fullName,
          previousState: !isLocked,
          newState: isLocked
        }))
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error in bulk worker lock/unlock:', error);
    return NextResponse.json(
      { error: 'Failed to update workers' },
      { status: 500 }
    );
  }
}