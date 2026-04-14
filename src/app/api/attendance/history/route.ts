import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// GET - Fetch attendance history for an assignment
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
    const assignmentId = searchParams.get('assignmentId');
    const dateParam = searchParams.get('date');

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    const workerId = authResult.user.id;

    // Build where clause
    const where: any = {
      workerId,
      assignmentId
    };

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

    // Fetch all attendance records for this assignment
    const history = await prisma.siteAttendance.findMany({
      where,
      orderBy: {
        checkInTime: 'desc'
      }
    });

    // Calculate total hours worked
    let totalMinutes = 0;
    history.forEach(record => {
      if (record.checkOutTime) {
        const checkIn = new Date(record.checkInTime);
        const checkOut = new Date(record.checkOutTime);
        const minutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
        totalMinutes += minutes;
      }
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    return NextResponse.json({
      siteAttendances: history,
      summary: {
        totalRecords: history.length,
        totalHours,
        totalMinutes: remainingMinutes,
        totalTimeFormatted: `${totalHours}h ${remainingMinutes}m`
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance history' },
      { status: 500 }
    );
  }
}
