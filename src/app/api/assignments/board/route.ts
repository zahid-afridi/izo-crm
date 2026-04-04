import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/assignments/board
 * Returns all data needed for the assignments board in a single request:
 * - assignments (grouped by site, filtered by date if provided)
 * - allWorkers (role=worker)
 * - availableWorkers (unlocked workers)
 * - allCars
 * - allSites (active/scheduled)
 * - allTeams (active)
 * - workersOnDayOff for the given date
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const dateForDayOff = dateParam || new Date().toISOString().split('T')[0];

    // Build assignment where clause
    const assignmentWhere: any = { status: 'active' };
    if (dateParam) {
      const d = new Date(dateParam);
      const start = new Date(d); start.setHours(0, 0, 0, 0);
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      assignmentWhere.assignedDate = { gte: start, lte: end };
    }

    const targetDate = new Date(dateForDayOff);
    targetDate.setHours(0, 0, 0, 0);

    // Fetch everything in parallel
    const [assignments, allWorkers, allCars, allSites, allTeams, dailyProgram] = await Promise.all([
      prisma.assignment.findMany({
        where: assignmentWhere,
        include: {
          site: {
            select: { id: true, name: true, address: true, city: true, status: true, progress: true, startDate: true, estimatedEndDate: true, actualEndDate: true },
          },
          worker: {
            select: { id: true, fullName: true, username: true, email: true, phone: true, role: true, isLocked: true },
          },
          car: {
            select: { id: true, name: true, number: true, color: true, model: true, status: true, isLocked: true },
          },
        },
        orderBy: [{ site: { name: 'asc' } }, { assignedDate: 'desc' }],
      }),

      prisma.users.findMany({
        where: { role: 'worker', status: 'active' },
        select: { id: true, fullName: true, email: true, phone: true, role: true, isLocked: true },
        orderBy: { fullName: 'asc' },
      }),

      prisma.car.findMany({
        select: { id: true, name: true, number: true, color: true, model: true, status: true, isLocked: true },
        orderBy: { name: 'asc' },
      }),

      prisma.site.findMany({
        where: { status: { in: ['active', 'scheduled', 'completed'] } },
        select: { id: true, name: true, address: true, city: true, status: true },
        orderBy: { name: 'asc' },
      }),

      prisma.team.findMany({
        where: { status: 'active' },
        include: {
          teamLead: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { name: 'asc' },
      }),

      prisma.dailyProgram.findUnique({ where: { date: targetDate } }),
    ]);

    // Group assignments by site
    const groupedBySite = assignments.reduce((acc: Record<string, any>, a) => {
      if (!acc[a.siteId]) {
        acc[a.siteId] = {
          id: a.site.id,
          name: a.site.name,
          address: a.site.address,
          city: a.site.city,
          siteStatus: a.site.status,
          progress: a.site.progress,
          startDate: a.site.startDate,
          estimatedEndDate: a.site.estimatedEndDate,
          actualEndDate: a.site.actualEndDate,
          isCompleted: a.site.status === 'completed',
          workers: [],
        };
      }
      acc[a.siteId].workers.push({
        id: a.id,
        workerId: a.worker.id,
        workerName: a.worker.fullName,
        workerUsername: a.worker.username,
        workerEmail: a.worker.email,
        workerPhone: a.worker.phone,
        workerRole: a.worker.role,
        workerIsLocked: a.worker.isLocked,
        showAssignmentHistory: a.showAssignmentHistory ?? false,
        car: a.car ?? null,
        assignedDate: a.assignedDate,
        status: a.status,
        notes: a.notes,
        createdAt: a.createdAt,
      });
      return acc;
    }, {});

    const workersOnDayOff: string[] = dailyProgram?.workersOnDayOff ?? [];
    const availableWorkers = allWorkers.filter(w => !w.isLocked && !workersOnDayOff.includes(w.id));

    return NextResponse.json({
      assignments: Object.values(groupedBySite),
      allWorkers,
      availableWorkers,
      allCars,
      allSites,
      allTeams,
      workersOnDayOff,
      dateFilter: dateParam ?? null,
    });
  } catch (error: any) {
    console.error('Error fetching assignments board:', error);
    return NextResponse.json({ error: 'Failed to fetch board data' }, { status: 500 });
  }
}
