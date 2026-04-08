import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const assignmentSelect = {
  id: true,
  siteId: true,
  workerId: true,
  carId: true,
  assignedDate: true,
  workerLocked: true,
  carLocked: true,
  status: true,
  notes: true,
  worker: { select: { id: true, fullName: true } },
  car: { select: { id: true, name: true, number: true } },
  site: { select: { id: true, name: true, address: true } },
};

function toAssignmentRow(a: any) {
  return {
    id: a.id,
    siteId: a.siteId,
    workerId: a.workerId,
    carId: a.carId ?? undefined,
    assignedDate: a.assignedDate.toISOString(),
    workerLocked: a.workerLocked,
    carLocked: a.carLocked,
    status: a.status,
    notes: a.notes ?? undefined,
    worker: a.worker,
    car: a.car ?? undefined,
    site: a.site,
  };
}

/**
 * GET /api/worker-profile/assignments?workerId=
 *
 * Returns:
 *  - today: assignment for today (if any, from upcoming finalized)
 *  - upcoming: today + future assignments where DailyProgram.isFinalized = true
 *              respects allowWorkersToSeeFullProgram visibility mode
 *  - history: all past assignments regardless of finalization
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workerId = searchParams.get('workerId');

  if (!workerId) {
    return NextResponse.json({ error: 'workerId query parameter is required' }, { status: 400 });
  }

  // Today's start in UTC
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  try {
    // Fetch all active assignments for this worker
    const allAssignments = await prisma.assignment.findMany({
      where: { workerId, status: 'active' },
      select: assignmentSelect,
      orderBy: { assignedDate: 'asc' },
    });

    // Split into upcoming (>= today) and history (< today)
    const rawUpcoming = allAssignments.filter(
      (a) => a.assignedDate >= todayStart
    );
    const rawHistory = allAssignments.filter(
      (a) => a.assignedDate < todayStart
    );

    // For upcoming: only include assignments where DailyProgram.isFinalized = true
    // Collect unique dates from upcoming assignments
    const uniqueDates = [...new Set(rawUpcoming.map((a) => a.assignedDate.getTime()))];

    // Fetch DailyPrograms for those dates
    const dailyPrograms = await prisma.dailyProgram.findMany({
      where: {
        date: { in: uniqueDates.map((t) => new Date(t)) },
        isFinalized: true,
      },
      select: {
        date: true,
        allowWorkersToSeeFullProgram: true,
      },
    });

    // Build a map: dateTime -> allowWorkersToSeeFullProgram
    const finalizedDateMap = new Map<number, boolean>(
      dailyPrograms.map((dp) => [dp.date.getTime(), dp.allowWorkersToSeeFullProgram])
    );

    // For dates with allowWorkersToSeeFullProgram = true, fetch all assignments for that date
    const fullProgramDates = dailyPrograms
      .filter((dp) => dp.allowWorkersToSeeFullProgram)
      .map((dp) => dp.date.getTime());

    let fullProgramAssignments: any[] = [];
    if (fullProgramDates.length > 0) {
      // Fetch all assignments for those dates (all sites)
      const fullProgramResults = await Promise.all(
        fullProgramDates.map((dateTime) => {
          const dateStart = new Date(dateTime);
          const dateEnd = new Date(dateTime + 24 * 60 * 60 * 1000);
          return prisma.assignment.findMany({
            where: {
              assignedDate: { gte: dateStart, lt: dateEnd },
              status: 'active',
            },
            select: assignmentSelect,
          });
        })
      );
      fullProgramAssignments = fullProgramResults.flat();
    }

    // Build upcoming list
    const upcomingMap = new Map<string, any>();

    // First add the worker's own assignments for finalized dates
    for (const a of rawUpcoming) {
      const dateTime = a.assignedDate.getTime();
      if (finalizedDateMap.has(dateTime)) {
        upcomingMap.set(a.id, a);
      }
    }

    // Then add full-program assignments (for dates with allowWorkersToSeeFullProgram = true)
    for (const a of fullProgramAssignments) {
      upcomingMap.set(a.id, a);
    }

    const upcomingRows = Array.from(upcomingMap.values())
      .map(toAssignmentRow)
      .sort((a, b) => new Date(a.assignedDate).getTime() - new Date(b.assignedDate).getTime());

    // Find today's assignment (if any)
    const todayEnd = todayStart.getTime() + 24 * 60 * 60 * 1000;
    const todayAssignment =
      upcomingRows.find((a) => {
        const t = new Date(a.assignedDate).getTime();
        return t >= todayStart.getTime() && t < todayEnd && a.workerId === workerId;
      }) ?? null;

    // History: all past assignments regardless of finalization
    const historyRows = rawHistory.map(toAssignmentRow).reverse(); // most recent first

    return NextResponse.json({
      today: todayAssignment,
      upcoming: upcomingRows,
      history: historyRows,
    });
  } catch (error: any) {
    console.error('Worker profile assignments error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worker assignments', details: error.message },
      { status: 500 }
    );
  }
}
