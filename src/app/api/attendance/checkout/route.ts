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

    const body = await request.json() as {
      siteAttendanceId?: string;
      attendanceId?: string;
      notes?: string;
      latitude?: number;
      longitude?: number;
    };
    const siteAttendanceId = body.siteAttendanceId ?? body.attendanceId;
    const { notes, latitude, longitude } = body;

    if (!siteAttendanceId) {
      return NextResponse.json(
        { error: 'Site attendance ID is required' },
        { status: 400 }
      );
    }

    const workerId = authResult.user.id;

    const record = await prisma.siteAttendance.findFirst({
      where: {
        id: siteAttendanceId,
        workerId
      }
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Site attendance record not found' },
        { status: 404 }
      );
    }

    if (record.checkOutTime) {
      return NextResponse.json(
        { error: 'Already checked out' },
        { status: 400 }
      );
    }

    const updated = await prisma.siteAttendance.update({
      where: { id: siteAttendanceId },
      data: {
        checkOutTime: new Date(),
        notes: notes || record.notes,
        checkOutLat: latitude || null,
        checkOutLng: longitude || null
      }
    });

    return NextResponse.json({ siteAttendance: updated }, { status: 200 });
  } catch (error) {
    console.error('Error checking out:', error);
    return NextResponse.json(
      { error: 'Failed to check out' },
      { status: 500 }
    );
  }
}
