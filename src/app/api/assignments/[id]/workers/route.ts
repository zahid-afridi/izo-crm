import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseTimeOnDate(date: Date, value?: string | null): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const hm = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (hm) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), Number(hm[1]), Number(hm[2]), 0, 0)
    );
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseRangeOnDate(date: Date, value?: string | null) {
  if (!value) return { start: null as Date | null, end: null as Date | null };
  const [left, right] = String(value)
    .split('-')
    .map((x) => x.trim());
  return {
    start: parseTimeOnDate(date, left),
    end: parseTimeOnDate(date, right),
  };
}

function formatHm(value?: Date | null) {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`;
}

function workerDto(row: any) {
  return {
    id: row.id,
    workerId: row.workerId,
    name: row.worker?.fullName || null,
    role: row.worker?.worker?.employeeType || row.worker?.role || 'worker',
    startTime: row.startTime,
    endTime: row.endTime,
    timeRange:
      row.startTime && row.endTime ? `${formatHm(row.startTime)} - ${formatHm(row.endTime)}` : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignment = await (prisma as any).assignment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const rows = await (prisma as any).assignmentWorker.findMany({
      where: { assignmentId: id },
      include: {
        worker: {
          select: {
            id: true,
            fullName: true,
            role: true,
            worker: { select: { employeeType: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ workers: rows.map(workerDto) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching assignment workers:', error);
    return NextResponse.json({ error: 'Failed to fetch assignment workers' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { workerId, startTime, endTime, time } = body || {};

    if (!workerId) {
      return NextResponse.json({ error: 'workerId is required' }, { status: 400 });
    }

    const assignment = await (prisma as any).assignment.findUnique({
      where: { id },
      select: { id: true, assignmentDate: true, startTime: true, endTime: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const worker = await prisma.users.findFirst({
      where: { id: String(workerId), role: 'worker' },
      select: { id: true },
    });
    if (!worker) {
      return NextResponse.json({ error: 'Worker not found or invalid role' }, { status: 404 });
    }

    const baseDate = new Date(assignment.assignmentDate);
    const range = parseRangeOnDate(baseDate, time);
    const row = await (prisma as any).assignmentWorker.upsert({
      where: {
        assignmentId_workerId: {
          assignmentId: id,
          workerId: worker.id,
        },
      },
      create: {
        assignmentId: id,
        workerId: worker.id,
        startTime: parseTimeOnDate(baseDate, startTime) ?? range.start ?? assignment.startTime ?? null,
        endTime: parseTimeOnDate(baseDate, endTime) ?? range.end ?? assignment.endTime ?? null,
      },
      update: {
        startTime: parseTimeOnDate(baseDate, startTime) ?? range.start ?? assignment.startTime ?? null,
        endTime: parseTimeOnDate(baseDate, endTime) ?? range.end ?? assignment.endTime ?? null,
      },
      include: {
        worker: {
          select: {
            id: true,
            fullName: true,
            role: true,
            worker: { select: { employeeType: true } },
          },
        },
      },
    });

    return NextResponse.json({ message: 'Worker assigned', worker: workerDto(row) }, { status: 200 });
  } catch (error) {
    console.error('Error assigning worker:', error);
    return NextResponse.json({ error: 'Failed to assign worker' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { workerId, startTime, endTime, time } = body || {};

    if (!workerId) {
      return NextResponse.json({ error: 'workerId is required' }, { status: 400 });
    }

    const assignment = await (prisma as any).assignment.findUnique({
      where: { id },
      select: { id: true, assignmentDate: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const existing = await (prisma as any).assignmentWorker.findUnique({
      where: {
        assignmentId_workerId: {
          assignmentId: id,
          workerId: String(workerId),
        },
      },
      select: { id: true, startTime: true, endTime: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Worker assignment not found' }, { status: 404 });
    }

    const baseDate = new Date(assignment.assignmentDate);
    const range = parseRangeOnDate(baseDate, time);
    const row = await (prisma as any).assignmentWorker.update({
      where: {
        assignmentId_workerId: {
          assignmentId: id,
          workerId: String(workerId),
        },
      },
      data: {
        startTime:
          startTime !== undefined
            ? parseTimeOnDate(baseDate, startTime)
            : time !== undefined
              ? range.start
              : existing.startTime,
        endTime:
          endTime !== undefined
            ? parseTimeOnDate(baseDate, endTime)
            : time !== undefined
              ? range.end
              : existing.endTime,
      },
      include: {
        worker: {
          select: {
            id: true,
            fullName: true,
            role: true,
            worker: { select: { employeeType: true } },
          },
        },
      },
    });

    return NextResponse.json({ message: 'Worker time updated', worker: workerDto(row) }, { status: 200 });
  } catch (error) {
    console.error('Error updating worker time:', error);
    return NextResponse.json({ error: 'Failed to update worker time' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { workerId } = body || {};

    if (!workerId) {
      return NextResponse.json({ error: 'workerId is required' }, { status: 400 });
    }

    const existing = await (prisma as any).assignmentWorker.findUnique({
      where: {
        assignmentId_workerId: {
          assignmentId: id,
          workerId: String(workerId),
        },
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Worker assignment not found' }, { status: 404 });
    }

    await (prisma as any).assignmentWorker.delete({
      where: {
        assignmentId_workerId: {
          assignmentId: id,
          workerId: String(workerId),
        },
      },
    });

    return NextResponse.json({ message: 'Worker removed from assignment' }, { status: 200 });
  } catch (error) {
    console.error('Error removing worker from assignment:', error);
    return NextResponse.json({ error: 'Failed to remove worker' }, { status: 500 });
  }
}

