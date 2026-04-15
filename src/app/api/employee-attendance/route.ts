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

const MANAGE_ROLES = new Set<UserRole>(['admin', 'hr']);

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

function getStatus(checkInTime: Date | null, checkOutTime: Date | null) {
  if (checkInTime && checkOutTime) return 'complete';
  if (checkInTime && !checkOutTime) return 'check_in_only';
  if (!checkInTime && checkOutTime) return 'check_out_only';
  return 'incomplete';
}

export async function GET(request: NextRequest) {
  const auth = requireRole(request, ALL_APP_ROLES);
  if (!auth.authorized || !auth.user) {
    return auth.response ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const requestedUserId = searchParams.get('userId');
    const canManage = MANAGE_ROLES.has(auth.user.role);

    const where: {
      userId?: string;
      attendanceDate?: {
        gte: Date;
        lt: Date;
      };
    } = {};

    if (canManage) {
      if (requestedUserId) {
        where.userId = requestedUserId;
      }
    } else {
      where.userId = auth.user.userId;
    }

    if (date) {
      const bounds = dayBounds(date);
      if (!bounds) {
        return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
      }
      where.attendanceDate = { gte: bounds.start, lt: bounds.end };
    }

    const rows = await prisma.employeeAttendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: [{ attendanceDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });

    return NextResponse.json({
      records: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        employeeName: row.user.fullName,
        role: row.user.role,
        attendanceDate: toIsoDate(row.attendanceDate),
        checkInTime: toIsoTime(row.checkInTime),
        checkOutTime: toIsoTime(row.checkOutTime),
        checkInMethod: row.checkInMethod,
        checkOutMethod: row.checkOutMethod,
        totalWorkedMinutes: row.totalWorkedMinutes,
        notes: row.notes,
        isManualEntry: row.isManualEntry,
        status: getStatus(row.checkInTime, row.checkOutTime),
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('employee-attendance GET failed', error);
    return NextResponse.json({ error: 'Failed to fetch employee attendance' }, { status: 500 });
  }
}
