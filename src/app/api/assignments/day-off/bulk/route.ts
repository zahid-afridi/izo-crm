import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseStartOfDay(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * POST /api/assignments/day-off/bulk
 * Body: { date: string (YYYY-MM-DD) }
 *
 * Computes the current available pool for the date and marks all pool workers
 * as day-off by upserting DailyProgram.workersOnDayOff (merged + deduped).
 * Creates Notification rows for each newly added worker.
 * Returns the count of workers marked as day-off.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date } = body;

    if (!date || !DATE_REGEX.test(date)) {
      return NextResponse.json(
        { error: 'Invalid or missing date. Expected format: YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const startOfDay = parseStartOfDay(date);
    const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Compute the pool (same logic as /api/assignments/pool)
    const [allActiveWorkers, lockedWorkerAssignments, dailyProgram] = await Promise.all([
      // 1. All active workers (role='worker', Worker.removeStatus='active')
      prisma.users.findMany({
        where: {
          role: 'worker',
          worker: { removeStatus: 'active' },
        },
        select: { id: true },
      }),

      // 2. Locked worker IDs for the date
      prisma.assignment.findMany({
        where: {
          assignedDate: { gte: startOfDay, lt: startOfNextDay },
          workerLocked: true,
        } as any,
        select: { workerId: true },
      }),

      // 3. Existing DailyProgram (day-off workers)
      prisma.dailyProgram.findUnique({
        where: { date: startOfDay },
        select: { workersOnDayOff: true },
      }),
    ]);

    const lockedWorkerIds = new Set(lockedWorkerAssignments.map((a) => a.workerId));
    const existingDayOffIds: string[] = dailyProgram?.workersOnDayOff ?? [];
    const dayOffWorkerIds = new Set(existingDayOffIds);

    // 4. Available workers = all active − locked − dayOff
    const availableWorkers = allActiveWorkers.filter(
      (w) => !lockedWorkerIds.has(w.id) && !dayOffWorkerIds.has(w.id)
    );

    const newDayOffIds = availableWorkers.map((w) => w.id);

    if (newDayOffIds.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    // Merge with existing day-off list (dedup)
    const merged = Array.from(new Set([...existingDayOffIds, ...newDayOffIds]));

    // Upsert DailyProgram
    await prisma.dailyProgram.upsert({
      where: { date: startOfDay },
      create: {
        date: startOfDay,
        workersOnDayOff: merged,
      },
      update: {
        workersOnDayOff: merged,
      },
    });

    // Create Notification rows for each newly added worker
    await prisma.notification.createMany({
      data: newDayOffIds.map((workerId) => ({
        userId: workerId,
        title: 'Day Off Confirmed',
        message: `Your day off on ${date} has been confirmed.`,
        module: 'assignments',
        type: 'day_off_confirmed',
        data: { date },
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ count: newDayOffIds.length });
  } catch (error: any) {
    console.error('POST /api/assignments/day-off/bulk error:', error);
    return NextResponse.json(
      { error: 'Failed to bulk mark workers as day-off' },
      { status: 500 }
    );
  }
}
