import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { dayBounds } from '@/lib/assignments-server';

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ['admin', 'site_manager']);
  if (!auth.authorized || !auth.user) {
    return auth.response ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { date, workerIds } = (await request.json()) as {
      date?: string;
      workerIds?: string[];
    };
    if (!date || !workerIds?.length) {
      return NextResponse.json({ error: 'date and workerIds required' }, { status: 400 });
    }

    const { start } = dayBounds(date);

    const existing = await prisma.dailyProgram.findUnique({ where: { date: start } });
    const merged = new Set(existing?.workersOnDayOff ?? []);
    for (const id of workerIds) merged.add(id);

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

    return NextResponse.json({ dailyProgram });
  } catch (e) {
    console.error('mark-day-off', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
