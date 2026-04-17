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

function carDto(row: any) {
  return {
    id: row.id,
    carId: row.carId,
    name: row.car?.name || null,
    model: row.car?.model || null,
    number: row.car?.number || null,
    type: [row.car?.model, row.car?.number].filter(Boolean).join(' • ') || 'Car',
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

    const rows = await (prisma as any).assignmentCar.findMany({
      where: { assignmentId: id },
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
    });

    return NextResponse.json({ cars: rows.map(carDto) }, { status: 200 });
  } catch (error) {
    console.error('Error fetching assignment cars:', error);
    return NextResponse.json({ error: 'Failed to fetch assignment cars' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { carId, startTime, endTime, time } = body || {};

    if (!carId) {
      return NextResponse.json({ error: 'carId is required' }, { status: 400 });
    }

    const assignment = await (prisma as any).assignment.findUnique({
      where: { id },
      select: { id: true, assignmentDate: true, startTime: true, endTime: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const car = await prisma.car.findUnique({
      where: { id: String(carId) },
      select: { id: true },
    });
    if (!car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    const baseDate = new Date(assignment.assignmentDate);
    const range = parseRangeOnDate(baseDate, time);
    const row = await (prisma as any).assignmentCar.upsert({
      where: {
        assignmentId_carId: {
          assignmentId: id,
          carId: car.id,
        },
      },
      create: {
        assignmentId: id,
        carId: car.id,
        startTime: parseTimeOnDate(baseDate, startTime) ?? range.start ?? assignment.startTime ?? null,
        endTime: parseTimeOnDate(baseDate, endTime) ?? range.end ?? assignment.endTime ?? null,
      },
      update: {
        startTime: parseTimeOnDate(baseDate, startTime) ?? range.start ?? assignment.startTime ?? null,
        endTime: parseTimeOnDate(baseDate, endTime) ?? range.end ?? assignment.endTime ?? null,
      },
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
    });

    return NextResponse.json({ message: 'Car assigned', car: carDto(row) }, { status: 200 });
  } catch (error) {
    console.error('Error assigning car:', error);
    return NextResponse.json({ error: 'Failed to assign car' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { carId, startTime, endTime, time } = body || {};

    if (!carId) {
      return NextResponse.json({ error: 'carId is required' }, { status: 400 });
    }

    const assignment = await (prisma as any).assignment.findUnique({
      where: { id },
      select: { id: true, assignmentDate: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const existing = await (prisma as any).assignmentCar.findUnique({
      where: {
        assignmentId_carId: {
          assignmentId: id,
          carId: String(carId),
        },
      },
      select: { id: true, startTime: true, endTime: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Car assignment not found' }, { status: 404 });
    }

    const baseDate = new Date(assignment.assignmentDate);
    const range = parseRangeOnDate(baseDate, time);
    const row = await (prisma as any).assignmentCar.update({
      where: {
        assignmentId_carId: {
          assignmentId: id,
          carId: String(carId),
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
        car: {
          select: {
            id: true,
            name: true,
            model: true,
            number: true,
          },
        },
      },
    });

    return NextResponse.json({ message: 'Car time updated', car: carDto(row) }, { status: 200 });
  } catch (error) {
    console.error('Error updating car time:', error);
    return NextResponse.json({ error: 'Failed to update car time' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { carId } = body || {};

    if (!carId) {
      return NextResponse.json({ error: 'carId is required' }, { status: 400 });
    }

    const existing = await (prisma as any).assignmentCar.findUnique({
      where: {
        assignmentId_carId: {
          assignmentId: id,
          carId: String(carId),
        },
      },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Car assignment not found' }, { status: 404 });
    }

    await (prisma as any).assignmentCar.delete({
      where: {
        assignmentId_carId: {
          assignmentId: id,
          carId: String(carId),
        },
      },
    });

    return NextResponse.json({ message: 'Car removed from assignment' }, { status: 200 });
  } catch (error) {
    console.error('Error removing car from assignment:', error);
    return NextResponse.json({ error: 'Failed to remove car from assignment' }, { status: 500 });
  }
}

