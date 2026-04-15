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

export async function POST(request: NextRequest) {
  const auth = requireRole(request, ALL_APP_ROLES);
  if (!auth.authorized || !auth.user) {
    return auth.response ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const openRecord = await prisma.employeeAttendance.findFirst({
      where: {
        userId: auth.user.userId,
        checkInTime: { not: null },
        checkOutTime: null,
      },
      orderBy: { checkInTime: 'desc' },
    });

    if (!openRecord) {
      return NextResponse.json({ error: 'No active check-in found.' }, { status: 400 });
    }

    const now = new Date();
    const totalWorkedMinutes =
      now.getTime() > openRecord.checkInTime!.getTime()
        ? Math.floor((now.getTime() - openRecord.checkInTime!.getTime()) / 60000)
        : null;

    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const updated = await prisma.employeeAttendance.update({
      where: { id: openRecord.id },
      data: {
        checkOutTime: now,
        checkOutMethod: 'self',
        checkOutUserAgent: userAgent,
        totalWorkedMinutes,
      },
    });

    return NextResponse.json({
      record: {
        id: updated.id,
        attendanceDate: updated.attendanceDate.toISOString().slice(0, 10),
        checkOutTime: updated.checkOutTime?.toISOString().slice(11, 16),
      },
    });
  } catch (error) {
    console.error('employee-attendance self check-out failed', error);
    return NextResponse.json({ error: 'Failed to check out' }, { status: 500 });
  }
}
