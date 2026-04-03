import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// GET - Fetch attendance records
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);

    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const workerId = searchParams.get('workerId') || authResult.user.id;
    const dateParam = searchParams.get('date');
    const assignmentId = searchParams.get('assignmentId');

    // Build where clause
    const where: any = { workerId };

    if (dateParam) {
      const targetDate = new Date(dateParam);
      targetDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      where.date = {
        gte: targetDate,
        lt: nextDay
      };
    }

    if (assignmentId) {
      where.assignmentId = assignmentId;
    }

    const attendance = await prisma.attendance.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { checkInTime: 'desc' }
      ]
    });

    return NextResponse.json({ attendance }, { status: 200 });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}

// POST - Create attendance record (check-in)
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
    const { assignmentId, notes, latitude, longitude } = body;

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    const workerId = authResult.user.id;
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Check if there's an active check-in (not checked out yet)
    const activeCheckIn = await prisma.attendance.findFirst({
      where: {
        workerId,
        assignmentId,
        checkOutTime: null
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    if (activeCheckIn) {
      return NextResponse.json(
        { error: 'Please check out before checking in again' },
        { status: 400 }
      );
    }

    // Create new attendance record
    const attendance = await prisma.attendance.create({
      data: {
        workerId,
        assignmentId,
        checkInTime: now,
        date: today,
        notes,
        checkInLat: latitude || null,
        checkInLng: longitude || null
      }
    });

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error) {
    console.error('Error creating attendance:', error);
    return NextResponse.json(
      { error: 'Failed to check in' },
      { status: 500 }
    );
  }
}

