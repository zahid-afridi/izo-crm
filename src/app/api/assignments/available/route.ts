import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET available workers (not locked), sites, and cars for assignment creation
// Optional teamId parameter to filter workers by team membership
// Also unlocks all cars to make them available
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const teamId = searchParams.get('teamId');
    const role = searchParams.get('role'); // Add role parameter support

    // First, unlock all cars to make them available
    await prisma.car.updateMany({
      where: {
        isLocked: true,
      },
      data: {
        isLocked: false,
      },
    });

    // Get all active sites
    const sites = await prisma.site.findMany({
      where: {
        status: {
          in: ['active', 'scheduled'],
        },
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        status: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get all available cars (now all unlocked and active)
    const cars = await prisma.car.findMany({
      where: {
        status: 'active',
        isLocked: false,
      },
      select: {
        id: true,
        name: true,
        number: true,
        model: true,
        status: true,
        isLocked: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Get all active workers that are not locked (available for assignment)
    let workers;
    
    // Determine which role to filter by (default to 'worker' if not specified)
    const workerRole = role || 'worker';
    
    if (teamId) {
      // If teamId is provided, get team members that are not locked
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { memberIds: true }
      });
      
      if (!team) {
        return NextResponse.json(
          { error: 'Team not found' },
          { status: 404 }
        );
      }
      
      workers = await prisma.users.findMany({
        where: {
          id: { in: team.memberIds },
          role: workerRole as any,
          isLocked: false,
          worker: {
            removeStatus: 'active',
          },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isLocked: true,
        },
        orderBy: {
          fullName: 'asc',
        },
      });
    } else {
      // If no teamId, get all available workers (not locked and active)
      workers = await prisma.users.findMany({
        where: {
          role: workerRole as any,
          isLocked: false, // Only get unlocked workers for available pool
          worker: {
            removeStatus: 'active',
          },
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          isLocked: true,
        },
        orderBy: {
          fullName: 'asc',
        },
      });
    }

    // If date is provided, filter out workers who already have assignments for that date
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const assignedWorkerIds = await prisma.assignment.findMany({
        where: {
          assignedDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          workerId: true,
        },
      });

      const assignedIds = assignedWorkerIds.map(a => a.workerId);
      workers = workers.filter(w => !assignedIds.includes(w.id));

      // Also filter out workers who are on day-off for this date
      const dailyProgram = await prisma.dailyProgram.findUnique({
        where: { date: startOfDay },
        select: { workersOnDayOff: true },
      });

      if (dailyProgram && dailyProgram.workersOnDayOff) {
        workers = workers.filter(w => !dailyProgram.workersOnDayOff.includes(w.id));
      }
    }

    return NextResponse.json(
      { sites, workers, cars },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching available resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available resources' },
      { status: 500 }
    );
  }
}
