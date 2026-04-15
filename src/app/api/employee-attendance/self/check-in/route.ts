import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, type UserRole } from '@/lib/auth-middleware';

const ALL_APP_ROLES: UserRole[] = [
  'admin',
  'product_manager',
  'site_manager',
  'offer_manager',
  'order_manager',
  'website_manager',
  'sales_agent',
  'office_employee',
  'worker',
  'hr',
  'website_user',
];

function startOfToday() {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  return day;
}

function endOfToday() {
  const day = startOfToday();
  day.setDate(day.getDate() + 1);
  return day;
}

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ALL_APP_ROLES);
  if (!auth.authorized || !auth.user) {
    return auth.response ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const now = new Date();

    const openRecord = await prisma.employeeAttendance.findFirst({
      where: {
        userId: auth.user.userId,
        attendanceDate: { gte: todayStart, lt: todayEnd },
        checkInTime: { not: null },
        checkOutTime: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (openRecord) {
      return NextResponse.json({ error: 'You already checked in today.' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const created = await prisma.employeeAttendance.create({
      data: {
        userId: auth.user.userId,
        attendanceDate: todayStart,
        checkInTime: now,
        checkInMethod: 'self',
        checkInUserAgent: userAgent,
        isManualEntry: false,
      },
    });

    return NextResponse.json(
      {
        record: {
          id: created.id,
          attendanceDate: created.attendanceDate.toISOString().slice(0, 10),
          checkInTime: created.checkInTime?.toISOString().slice(11, 16),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('employee-attendance self check-in failed', error);
    return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
  }
}
