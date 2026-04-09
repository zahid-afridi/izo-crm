import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * GET /api/worker/assignments
 * Returns the authenticated worker's assignments:
 *  - today
 *  - upcoming (future dates)
 *  - past (last 90 days)
 *  - workday summary (current month + selected month)
 * Each assignment includes co-workers on the same site/date (if allowed by daily program).
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workerId = authResult.user.id;
    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month'); // YYYY-MM for workday summary

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(todayStart.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Fetch all relevant assignments in parallel
    const [todayAssignments, upcomingAssignments, pastAssignments, dailyPrograms] =
      await Promise.all([
        // Today
        prisma.assignment.findMany({
          where: {
            workerId,
            status: 'active',
            assignedDate: { gte: todayStart, lt: todayEnd },
          },
          include: {
            site: { select: { id: true, name: true, address: true, city: true } },
            car: { select: { id: true, name: true, number: true, color: true, model: true } },
          },
          orderBy: { assignedDate: 'asc' },
        }),

        // Upcoming (tomorrow onwards, next 60 days)
        prisma.assignment.findMany({
          where: {
            workerId,
            status: 'active',
            assignedDate: {
              gte: todayEnd,
              lt: new Date(todayEnd.getTime() + 60 * 24 * 60 * 60 * 1000),
            },
          },
          include: {
            site: { select: { id: true, name: true, address: true, city: true } },
            car: { select: { id: true, name: true, number: true, color: true, model: true } },
          },
          orderBy: { assignedDate: 'asc' },
        }),

        // Past (last 90 days)
        prisma.assignment.findMany({
          where: {
            workerId,
            assignedDate: { gte: ninetyDaysAgo, lt: todayStart },
          },
          include: {
            site: { select: { id: true, name: true, address: true, city: true } },
            car: { select: { id: true, name: true, number: true, color: true, model: true } },
          },
          orderBy: { assignedDate: 'desc' },
          take: 60,
        }),

        // Daily programs for today + upcoming dates (for allowWorkersToSeeFullProgram)
        prisma.dailyProgram.findMany({
          where: {
            date: { gte: todayStart },
          },
          select: {
            date: true,
            allowWorkersToSeeFullProgram: true,
            isFinalized: true,
            workersOnDayOff: true,
          },
        }),
      ]);

    // Build a map of date -> dailyProgram
    const programMap = new Map<string, { allowFull: boolean; isFinalized: boolean; dayOff: string[] }>();
    for (const dp of dailyPrograms) {
      const key = dp.date.toISOString().slice(0, 10);
      programMap.set(key, {
        allowFull: dp.allowWorkersToSeeFullProgram,
        isFinalized: dp.isFinalized,
        dayOff: dp.workersOnDayOff,
      });
    }

    // Helper: enrich assignment with co-workers
    const enrichAssignment = async (a: any) => {
      const aDate = new Date(a.assignedDate);
      const dayStart = new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dateKey = dayStart.toISOString().slice(0, 10);
      const program = programMap.get(dateKey);
      const allowFull = program?.allowFull ?? false;

      // Always fetch co-workers on same site+date
      const coWorkerAssignments = await prisma.assignment.findMany({
        where: {
          siteId: a.siteId,
          assignedDate: { gte: dayStart, lt: dayEnd },
          status: 'active',
          workerId: { not: workerId },
        },
        include: {
          worker: { select: { id: true, fullName: true, phone: true } },
        },
      });

      const teamMembers = coWorkerAssignments.map((cw) => ({
        id: cw.worker.id,
        fullName: cw.worker.fullName,
        phone: cw.worker.phone ?? null,
      }));

      // Full program: all assignments for that date (other sites too)
      let fullProgram: any[] = [];
      if (allowFull) {
        const allDayAssignments = await prisma.assignment.findMany({
          where: {
            assignedDate: { gte: dayStart, lt: dayEnd },
            status: 'active',
            siteId: { not: a.siteId },
          },
          include: {
            site: { select: { id: true, name: true, address: true } },
            worker: { select: { id: true, fullName: true } },
            car: { select: { id: true, name: true, number: true, color: true } },
          },
        });

        // Group by site
        const siteMap = new Map<string, any>();
        for (const oa of allDayAssignments) {
          if (!siteMap.has(oa.siteId)) {
            siteMap.set(oa.siteId, {
              site: oa.site,
              car: oa.car,
              workers: [],
            });
          }
          siteMap.get(oa.siteId).workers.push({ id: oa.worker.id, fullName: oa.worker.fullName });
        }
        fullProgram = Array.from(siteMap.values());
      }

      return {
        id: a.id,
        siteId: a.siteId,
        site: a.site,
        car: a.car ?? null,
        assignedDate: dayStart.toISOString().slice(0, 10),
        status: a.status,
        notes: a.notes ?? null,
        teamMembers,
        allowFullProgram: allowFull,
        fullProgram,
        isFinalized: program?.isFinalized ?? false,
      };
    };

    // Enrich today and upcoming in parallel
    const [enrichedToday, enrichedUpcoming] = await Promise.all([
      Promise.all(todayAssignments.map(enrichAssignment)),
      Promise.all(upcomingAssignments.map(enrichAssignment)),
    ]);

    // Past assignments - simpler (no full program needed)
    const enrichedPast = await Promise.all(
      pastAssignments.map(async (a) => {
        const aDate = new Date(a.assignedDate);
        const dayStart = new Date(aDate.getFullYear(), aDate.getMonth(), aDate.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const coWorkers = await prisma.assignment.findMany({
          where: {
            siteId: a.siteId,
            assignedDate: { gte: dayStart, lt: dayEnd },
            workerId: { not: workerId },
          },
          include: { worker: { select: { id: true, fullName: true } } },
        });

        return {
          id: a.id,
          siteId: a.siteId,
          site: a.site,
          car: a.car ?? null,
          assignedDate: dayStart.toISOString().slice(0, 10),
          status: a.status,
          notes: a.notes ?? null,
          teamMembers: coWorkers.map((cw) => ({ id: cw.worker.id, fullName: cw.worker.fullName })),
        };
      })
    );

    // Workday summary
    const summaryMonth = monthParam
      ? new Date(monthParam + '-01')
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const summaryMonthEnd = new Date(summaryMonth.getFullYear(), summaryMonth.getMonth() + 1, 1);

    const [monthWorkDays, totalWorkDays] = await Promise.all([
      prisma.assignment.count({
        where: {
          workerId,
          assignedDate: { gte: summaryMonth, lt: summaryMonthEnd },
        },
      }),
      prisma.assignment.count({
        where: { workerId },
      }),
    ]);

    // Group past by month for the history summary
    const monthlyBreakdown: Record<string, number> = {};
    for (const a of pastAssignments) {
      const key = a.assignedDate.toISOString().slice(0, 7); // YYYY-MM
      monthlyBreakdown[key] = (monthlyBreakdown[key] ?? 0) + 1;
    }

    return NextResponse.json({
      today: enrichedToday,
      upcoming: enrichedUpcoming,
      past: enrichedPast,
      summary: {
        monthWorkDays,
        totalWorkDays,
        summaryMonth: summaryMonth.toISOString().slice(0, 7),
        monthlyBreakdown,
      },
    });
  } catch (error) {
    console.error('GET /api/worker/assignments error:', error);
    return NextResponse.json({ error: 'Failed to fetch worker assignments' }, { status: 500 });
  }
}
