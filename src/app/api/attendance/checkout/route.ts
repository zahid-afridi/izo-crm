import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// POST - Check out (update attendance record)
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);

    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { attendanceId, notes, latitude, longitude } = body;

    if (!attendanceId) {
      return NextResponse.json(
        { error: 'Attendance ID is required' },
        { status: 400 }
      );
    }

    const workerId = authResult.user.id;

    // Find the attendance record
    const attendance = await prisma.attendance.findFirst({
      where: {
        id: attendanceId,
        workerId
      }
    });

    if (!attendance) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    if (attendance.checkOutTime) {
      return NextResponse.json(
        { error: 'Already checked out' },
        { status: 400 }
      );
    }

    // Update with checkout time and location
    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        checkOutTime: new Date(),
        notes: notes || attendance.notes,
        checkOutLat: latitude || null,
        checkOutLng: longitude || null
      }
    });

    return NextResponse.json({ attendance: updated }, { status: 200 });
  } catch (error) {
    console.error('Error checking out:', error);
    return NextResponse.json(
      { error: 'Failed to check out' },
      { status: 500 }
    );
  }
}
