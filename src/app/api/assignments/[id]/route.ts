import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizeDateOnly(value?: string | null): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0));
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0)
  );
}

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

function assignmentDto(row: any) {
  return {
    id: row.id,
    siteId: row.siteId,
    siteName: row.site?.name || null,
    assignmentDate: row.assignmentDate,
    startTime: row.startTime,
    endTime: row.endTime,
    timeRange:
      row.startTime && row.endTime ? `${formatHm(row.startTime)} - ${formatHm(row.endTime)}` : null,
    status: row.status,
    publishedAt: row.publishedAt,
    assignedWorkers:
      row.workers?.map((w: any) => ({
        id: w.id,
        workerId: w.workerId,
        name: w.worker?.fullName || null,
        role: w.worker?.worker?.employeeType || w.worker?.role || 'worker',
        startTime: w.startTime,
        endTime: w.endTime,
        timeRange:
          w.startTime && w.endTime ? `${formatHm(w.startTime)} - ${formatHm(w.endTime)}` : null,
      })) || [],
    assignedCars:
      row.cars?.map((c: any) => ({
        id: c.id,
        carId: c.carId,
        name: c.car?.name || null,
        model: c.car?.model || null,
        number: c.car?.number || null,
        type: [c.car?.model, c.car?.number].filter(Boolean).join(' • ') || 'Car',
        startTime: c.startTime,
        endTime: c.endTime,
        timeRange:
          c.startTime && c.endTime ? `${formatHm(c.startTime)} - ${formatHm(c.endTime)}` : null,
      })) || [],
    remainingLeave: [],
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
    const row = await (prisma as any).assignment.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true } },
        workers: {
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
        },
        cars: {
          include: {
            car: {
              select: {
                id: true,
                name: true,
                model: true,
                number: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!row) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    return NextResponse.json({ assignment: assignmentDto(row) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json({ error: 'Failed to fetch assignment' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { assignmentDate, startTime, endTime, timeRange, status } = body || {};

    const existing = await (prisma as any).assignment.findUnique({
      where: { id },
      select: { id: true, assignmentDate: true },
    });
    if (!existing) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    const baseDate = normalizeDateOnly(assignmentDate) || new Date(existing.assignmentDate);
    const range = parseRangeOnDate(baseDate, timeRange);

    const data: any = {};
    if (assignmentDate) data.assignmentDate = baseDate;
    if (startTime !== undefined || timeRange !== undefined) {
      data.startTime = parseTimeOnDate(baseDate, startTime) ?? range.start;
    }
    if (endTime !== undefined || timeRange !== undefined) {
      data.endTime = parseTimeOnDate(baseDate, endTime) ?? range.end;
    }
    if (status) {
      data.status = status;
      data.publishedAt = status === 'published' ? new Date() : null;
    }

    await (prisma as any).assignment.update({
      where: { id },
      data,
    });

    const row = await (prisma as any).assignment.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true } },
        workers: {
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
        },
        cars: {
          include: {
            car: {
              select: {
                id: true,
                name: true,
                model: true,
                number: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json(
      { message: 'Assignment updated successfully', assignment: assignmentDto(row) },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating assignment:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Assignment already exists for site/date' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await (prisma as any).assignment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });

    await (prisma as any).assignment.delete({ where: { id } });
    return NextResponse.json({ message: 'Assignment deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}

