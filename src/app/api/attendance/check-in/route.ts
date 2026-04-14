import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { sameLocalDay, startOfLocalDay } from '@/lib/attendance-utils';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.isValid || !auth.user || auth.user.role !== 'worker') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      assignmentId?: string;
      lat?: number;
      lng?: number;
    };
    const { assignmentId, lat, lng } = body;
    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId required' }, { status: 400 });
    }

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, workerId: auth.user.id, status: 'active' },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const now = new Date();
    if (!sameLocalDay(now, assignment.assignedDate)) {
      return NextResponse.json(
        { error: 'Check-in is only allowed on the assignment date' },
        { status: 400 }
      );
    }

    const dayStart = startOfLocalDay(assignment.assignedDate);

    const open = await prisma.siteAttendance.findFirst({
      where: {
        assignmentId,
        workerId: auth.user.id,
        checkOutTime: null,
      },
    });

    if (open) {
      return NextResponse.json(
        { error: 'Already checked in. Check out first.', siteAttendanceId: open.id },
        { status: 400 }
      );
    }

    const created = await prisma.siteAttendance.create({
      data: {
        workerId: auth.user.id,
        assignmentId,
        checkInTime: now,
        date: dayStart,
        checkInLat: lat ?? null,
        checkInLng: lng ?? null,
      },
    });

    return NextResponse.json({
      id: created.id,
      checkInTime: created.checkInTime.toISOString(),
    });
  } catch (e) {
    console.error('check-in', e);
    return NextResponse.json({ error: 'Check-in failed' }, { status: 500 });
  }
}
