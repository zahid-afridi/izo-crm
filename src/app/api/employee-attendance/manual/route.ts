import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';

type ManualAction = 'check_in' | 'check_out' | 'check_in_out';

function parseDateTime(attendanceDate: string, time: string) {
  if (!attendanceDate || !time) return null;
  const value = new Date(`${attendanceDate}T${time}:00`);
  if (Number.isNaN(value.getTime())) {
    return null;
  }
  return value;
}

function dayBounds(dateInput: string) {
  const day = new Date(`${dateInput}T00:00:00`);
  if (Number.isNaN(day.getTime())) {
    return null;
  }
  const next = new Date(day);
  next.setDate(next.getDate() + 1);
  return { start: day, end: next };
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function toIsoTime(value: Date | null) {
  if (!value) return null;
  return value.toISOString().slice(11, 16);
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ['admin', 'hr']);
  if (!auth.authorized || !auth.user) {
    return auth.response ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      userId?: string;
      attendanceDate?: string;
      action?: ManualAction;
      time?: string;
      checkInTime?: string;
      checkOutTime?: string;
      notes?: string;
    };

    const userId = body.userId?.trim();
    const attendanceDate = body.attendanceDate?.trim();
    const action = body.action;
    const time = body.time?.trim();
    const checkInTime = body.checkInTime?.trim();
    const checkOutTime = body.checkOutTime?.trim();
    const notes = body.notes?.trim() || null;

    if (!userId || !attendanceDate || !action) {
      return NextResponse.json(
        { error: 'userId, attendanceDate, and action are required' },
        { status: 400 }
      );
    }

    if (action !== 'check_in' && action !== 'check_out' && action !== 'check_in_out') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const bounds = dayBounds(attendanceDate);
    if (!bounds) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown';

    if (action === 'check_in') {
      if (!time) {
        return NextResponse.json({ error: 'Time is required for check-in' }, { status: 400 });
      }
      const when = parseDateTime(attendanceDate, time);
      if (!when) {
        return NextResponse.json({ error: 'Invalid time format' }, { status: 400 });
      }

      // Rule: manual flow only allows check-in in this request (no check-out completion here).
      const openRecord = await prisma.employeeAttendance.findFirst({
        where: {
          userId,
          attendanceDate: { gte: bounds.start, lt: bounds.end },
          checkInTime: { not: null },
          checkOutTime: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (openRecord) {
        return NextResponse.json(
          { error: 'An open check-in already exists for this date. Use check-out action only.' },
          { status: 400 }
        );
      }

      const created = await prisma.employeeAttendance.create({
        data: {
          userId,
          attendanceDate: bounds.start,
          checkInTime: when,
          checkInMethod: 'manual',
          checkInUserAgent: userAgent,
          notes,
          isManualEntry: true,
        },
      });

      return NextResponse.json(
        {
          record: {
            id: created.id,
            userId: created.userId,
            employeeName: user.fullName,
            attendanceDate: toIsoDate(created.attendanceDate),
            checkInTime: toIsoTime(created.checkInTime),
            checkOutTime: toIsoTime(created.checkOutTime),
            notes: created.notes,
            status: 'check_in_only',
          },
        },
        { status: 201 }
      );
    }

    if (action === 'check_in_out') {
      if (!checkInTime || !checkOutTime) {
        return NextResponse.json(
          { error: 'checkInTime and checkOutTime are required for check-in + check-out' },
          { status: 400 }
        );
      }

      const checkInWhen = parseDateTime(attendanceDate, checkInTime);
      const checkOutWhen = parseDateTime(attendanceDate, checkOutTime);
      if (!checkInWhen || !checkOutWhen) {
        return NextResponse.json({ error: 'Invalid check-in or check-out time format' }, { status: 400 });
      }
      if (checkOutWhen.getTime() <= checkInWhen.getTime()) {
        return NextResponse.json(
          { error: 'Check-out time must be after check-in time' },
          { status: 400 }
        );
      }

      const openRecord = await prisma.employeeAttendance.findFirst({
        where: {
          userId,
          attendanceDate: { gte: bounds.start, lt: bounds.end },
          checkInTime: { not: null },
          checkOutTime: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (openRecord) {
        return NextResponse.json(
          { error: 'An open check-in exists for this date. Complete that record first.' },
          { status: 400 }
        );
      }

      const totalWorkedMinutes = Math.floor((checkOutWhen.getTime() - checkInWhen.getTime()) / 60000);
      const created = await prisma.employeeAttendance.create({
        data: {
          userId,
          attendanceDate: bounds.start,
          checkInTime: checkInWhen,
          checkOutTime: checkOutWhen,
          checkInMethod: 'manual',
          checkOutMethod: 'manual',
          checkInUserAgent: userAgent,
          checkOutUserAgent: userAgent,
          totalWorkedMinutes,
          notes,
          isManualEntry: true,
        },
      });

      return NextResponse.json(
        {
          record: {
            id: created.id,
            userId: created.userId,
            employeeName: user.fullName,
            attendanceDate: toIsoDate(created.attendanceDate),
            checkInTime: toIsoTime(created.checkInTime),
            checkOutTime: toIsoTime(created.checkOutTime),
            notes: created.notes,
            status: 'complete',
          },
        },
        { status: 201 }
      );
    }

    // action === 'check_out'
    if (!time) {
      return NextResponse.json({ error: 'Time is required for check-out' }, { status: 400 });
    }
    const when = parseDateTime(attendanceDate, time);
    if (!when) {
      return NextResponse.json({ error: 'Invalid time format' }, { status: 400 });
    }

    const openRecord = await prisma.employeeAttendance.findFirst({
      where: {
        userId,
        attendanceDate: { gte: bounds.start, lt: bounds.end },
        checkInTime: { not: null },
        checkOutTime: null,
      },
      orderBy: { checkInTime: 'desc' },
    });

    if (openRecord) {
      const totalWorkedMinutes =
        when.getTime() > openRecord.checkInTime!.getTime()
          ? Math.floor((when.getTime() - openRecord.checkInTime!.getTime()) / 60000)
          : null;

      const updated = await prisma.employeeAttendance.update({
        where: { id: openRecord.id },
        data: {
          checkOutTime: when,
          checkOutMethod: 'manual',
          checkOutUserAgent: userAgent,
          notes: notes ?? openRecord.notes,
          totalWorkedMinutes,
          isManualEntry: true,
        },
      });

      return NextResponse.json({
        record: {
          id: updated.id,
          userId: updated.userId,
          employeeName: user.fullName,
          attendanceDate: toIsoDate(updated.attendanceDate),
          checkInTime: toIsoTime(updated.checkInTime),
          checkOutTime: toIsoTime(updated.checkOutTime),
          notes: updated.notes,
          status: 'complete',
        },
      });
    }

    return NextResponse.json(
      { error: 'No check-in found for this date. Please check in the user first.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('employee-attendance manual POST failed', error);
    return NextResponse.json({ error: 'Failed to save manual attendance entry' }, { status: 500 });
  }
}
