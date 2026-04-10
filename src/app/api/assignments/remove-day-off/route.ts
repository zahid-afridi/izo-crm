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
    const { date, workerId } = (await request.json()) as { date?: string; workerId?: string };
    if (!date || !workerId) {
      return NextResponse.json({ error: 'date and workerId required' }, { status: 400 });
    }

    const { start } = dayBounds(date);

    const existing = await prisma.dailyProgram.findUnique({ where: { date: start } });
    if (!existing) {
      return NextResponse.json({ dailyProgram: null });
    }

    const workersOnDayOff = existing.workersOnDayOff.filter((id) => id !== workerId);
    const dailyProgram = await prisma.dailyProgram.update({
      where: { id: existing.id },
      data: { workersOnDayOff },
    });

    return NextResponse.json({ dailyProgram });
  } catch (e) {
    console.error('remove-day-off', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
