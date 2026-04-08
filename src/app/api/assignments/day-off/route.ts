import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseStartOfDay(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// POST /api/assignments/day-off
// Body: { date: string (YYYY-MM-DD), workerIds: string[] }
// Upserts DailyProgram, appending workerIds to workersOnDayOff (deduped),
// and creates Notification rows for each worker.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, workerIds } = body;

    if (!date || !DATE_REGEX.test(date)) {
      return NextResponse.json(
        { error: 'Invalid or missing date. Expected format: YYYY-MM-DD' },
        { status: 400 }
      );
    }

    if (!workerIds || !Array.isArray(workerIds) || workerIds.length === 0) {
      return NextResponse.json(
        { error: 'workerIds must be a non-empty array' },
        { status: 400 }
      );
    }

    const startOfDay = parseStartOfDay(date);

    // Fetch existing DailyProgram to merge arrays with dedup
    const existing = await prisma.dailyProgram.findUnique({
      where: { date: startOfDay },
      select: { workersOnDayOff: true },
    });

    const currentIds: string[] = existing?.workersOnDayOff ?? [];
    const merged = Array.from(new Set([...currentIds, ...workerIds]));

    const dailyProgram = await prisma.dailyProgram.upsert({
      where: { date: startOfDay },
      create: {
        date: startOfDay,
        workersOnDayOff: merged,
      },
      update: {
        workersOnDayOff: merged,
      },
    });

    // Create Notification rows for each worker (best-effort, no FCM available)
    await prisma.notification.createMany({
      data: workerIds.map((workerId: string) => ({
        userId: workerId,
        title: 'Day Off Confirmed',
        message: `Your day off on ${date} has been confirmed.`,
        module: 'assignments',
        type: 'day_off_confirmed',
        data: { date },
      })),
      skipDuplicates: true,
    });

    return NextResponse.json(
      { message: 'Day off recorded successfully', dailyProgram },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('POST /api/assignments/day-off error:', error);
    return NextResponse.json(
      { error: 'Failed to record day off' },
      { status: 500 }
    );
  }
}

// DELETE /api/assignments/day-off
// Body: { date: string (YYYY-MM-DD), workerId: string }
// Removes workerId from DailyProgram.workersOnDayOff.
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, workerId } = body;

    if (!date || !DATE_REGEX.test(date)) {
      return NextResponse.json(
        { error: 'Invalid or missing date. Expected format: YYYY-MM-DD' },
        { status: 400 }
      );
    }

    if (!workerId || typeof workerId !== 'string') {
      return NextResponse.json(
        { error: 'workerId is required' },
        { status: 400 }
      );
    }

    const startOfDay = parseStartOfDay(date);

    const existing = await prisma.dailyProgram.findUnique({
      where: { date: startOfDay },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'No DailyProgram found for the given date' },
        { status: 404 }
      );
    }

    const updated = existing.workersOnDayOff.filter((id: string) => id !== workerId);

    const dailyProgram = await prisma.dailyProgram.update({
      where: { date: startOfDay },
      data: { workersOnDayOff: updated },
    });

    return NextResponse.json(
      { message: 'Worker removed from day off', dailyProgram },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('DELETE /api/assignments/day-off error:', error);
    return NextResponse.json(
      { error: 'Failed to remove worker from day off' },
      { status: 500 }
    );
  }
}
