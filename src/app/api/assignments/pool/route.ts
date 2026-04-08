import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';

/**
 * GET /api/assignments/pool?date=YYYY-MM-DD
 * Returns available workers and cars for assignment on the given date.
 * Restricted to site_manager and admin roles.
 */
export async function GET(request: NextRequest) {
  // Auth check
  const auth = requireRole(request, ['admin', 'site_manager']);
  if (!auth.authorized) return auth.response!;

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  // Validate date format YYYY-MM-DD
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: 'date query parameter is required and must be in YYYY-MM-DD format' },
      { status: 400 }
    );
  }

  const parsedDate = new Date(dateParam);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json(
      { error: 'Invalid date value' },
      { status: 400 }
    );
  }

  // Build date range for the given day
  const startOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  try {
    // Run all queries in parallel
    const [allActiveWorkers, lockedWorkerAssignments, dailyProgram, allActiveCars, lockedCarAssignments] =
      await Promise.all([
        // 1. All active workers (role='worker', Worker.removeStatus='active')
        prisma.users.findMany({
          where: {
            role: 'worker',
            worker: { removeStatus: 'active' },
          },
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
          orderBy: { fullName: 'asc' },
        }),

        // 2. Assignments for the date where workerLocked=true
        prisma.assignment.findMany({
          where: {
            assignedDate: { gte: startOfDay, lt: startOfNextDay },
            workerLocked: true,
          } as any,
          select: { workerId: true },
        }),

        // 3. DailyProgram for the date (day-off workers)
        prisma.dailyProgram.findUnique({
          where: { date: startOfDay },
          select: { workersOnDayOff: true },
        }),

        // 5. All active cars
        prisma.car.findMany({
          where: { status: 'active' },
          select: {
            id: true,
            name: true,
            number: true,
            model: true,
            color: true,
          },
          orderBy: { name: 'asc' },
        }),

        // 6. Assignments for the date where carLocked=true
        prisma.assignment.findMany({
          where: {
            assignedDate: { gte: startOfDay, lt: startOfNextDay },
            carLocked: true,
            carId: { not: null },
          } as any,
          select: { carId: true },
        }),
      ]);

    // Build exclusion sets
    const lockedWorkerIds = new Set(lockedWorkerAssignments.map((a) => a.workerId));
    const dayOffWorkerIds = new Set(dailyProgram?.workersOnDayOff ?? []);
    const lockedCarIds = new Set(
      lockedCarAssignments.map((a) => a.carId).filter(Boolean) as string[]
    );

    // 4. Available workers = all active workers − lockedWorkerIds − dayOffWorkerIds
    const availableWorkers = allActiveWorkers.filter(
      (w) => !lockedWorkerIds.has(w.id) && !dayOffWorkerIds.has(w.id)
    );

    // 7. Available cars = all active cars − lockedCarIds
    const availableCars = allActiveCars.filter((c) => !lockedCarIds.has(c.id));

    return NextResponse.json({
      workers: availableWorkers,
      cars: availableCars,
      dayOffWorkerIds: [...dayOffWorkerIds],
    });
  } catch (error: any) {
    console.error('Error computing pool:', error);
    return NextResponse.json({ error: 'Failed to compute pool' }, { status: 500 });
  }
}
