import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workerId = searchParams.get('workerId');
    let month = searchParams.get('month');

    if (!workerId) {
      return NextResponse.json({ error: 'workerId is required' }, { status: 400 });
    }

    // Default to current month if not provided
    if (!month) {
      const now = new Date();
      const y = now.getUTCFullYear();
      const m = String(now.getUTCMonth() + 1).padStart(2, '0');
      month = `${y}-${m}`;
    }

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 });
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(year, monthNum, 1));

    // Count assignments (work days) for the worker in the month
    const workDays = await prisma.assignment.count({
      where: {
        workerId,
        assignedDate: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    // Fetch attendance records for the worker in the month (skip records without checkOutTime)
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        workerId,
        date: {
          gte: startDate,
          lt: endDate,
        },
        checkOutTime: { not: null },
      },
      select: {
        checkInTime: true,
        checkOutTime: true,
      },
    });

    // Sum extra hours: (checkOutTime - checkInTime) in hours
    const extraHours = attendanceRecords.reduce((sum, record) => {
      if (!record.checkOutTime) return sum;
      const diffMs = record.checkOutTime.getTime() - record.checkInTime.getTime();
      return sum + diffMs / (1000 * 60 * 60);
    }, 0);

    return NextResponse.json({ workDays, extraHours });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch worker summary: ' + err.message }, { status: 500 });
  }
}
