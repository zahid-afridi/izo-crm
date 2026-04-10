import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { dayBounds, workerIdsLockedOnDay } from '@/lib/assignments-server';

/**
 * Mark every worker still in the "pool" (no locked assignment that day, not already on day off) as day off.
 */
export async function POST(request: NextRequest) {
  const auth = requireRole(request, ['admin', 'site_manager']);
  if (!auth.authorized || !auth.user) {
    return auth.response ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { date } = (await request.json()) as { date?: string };
    if (!date) {
      return NextResponse.json({ error: 'date required' }, { status: 400 });
    }

    const { start, end } = dayBounds(date);

    const [lockedIds, workerUsers, dp] = await Promise.all([
      workerIdsLockedOnDay(prisma, start, end),
      prisma.users.findMany({
        where: { role: 'worker', status: 'active', isLocked: false },
        select: { id: true, worker: { select: { removeStatus: true } } },
      }),
      prisma.dailyProgram.findUnique({ where: { date: start } }),
    ]);

    const activeWorkerIds = workerUsers
      .filter((u) => !u.worker || u.worker.removeStatus === 'active')
      .map((u) => u.id);

    const alreadyOff = new Set(dp?.workersOnDayOff ?? []);

    const poolRemaining = activeWorkerIds.filter(
      (id) => !lockedIds.has(id) && !alreadyOff.has(id)
    );

    const merged = new Set([...alreadyOff, ...poolRemaining]);

    const dailyProgram = await prisma.dailyProgram.upsert({
      where: { date: start },
      create: {
        date: start,
        workersOnDayOff: [...merged],
        allowWorkersToSeeFullProgram: false,
        isFinalized: false,
      },
      update: { workersOnDayOff: [...merged] },
    });

    return NextResponse.json({ dailyProgram, addedCount: poolRemaining.length });
  } catch (e) {
    console.error('bulk-day-off', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
