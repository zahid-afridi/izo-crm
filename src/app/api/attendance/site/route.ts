import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { assertSiteAccess, dayBounds } from '@/lib/assignments-server';

/** GET /api/attendance/site?siteId=&date=YYYY-MM-DD */
export async function GET(request: NextRequest) {
  const auth = requireRole(request, ['admin', 'site_manager']);
  if (!auth.authorized || !auth.user) {
    return auth.response ?? NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId');
  const dateParam = searchParams.get('date');
  if (!siteId || !dateParam) {
    return NextResponse.json({ error: 'siteId and date required' }, { status: 400 });
  }

  const ok = await assertSiteAccess(prisma, auth.user, siteId);
  if (!ok) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { start, end } = dayBounds(dateParam);

  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        siteId,
        status: 'active',
        assignedDate: { gte: start, lt: end },
      },
      select: { id: true, workerId: true },
    });

    const ids = assignments.map((a) => a.id);
    const attendance = await prisma.attendance.findMany({
      where: { assignmentId: { in: ids } },
      include: {
        assignment: {
          include: {
            worker: { select: { id: true, fullName: true, phone: true } },
          },
        },
      },
      orderBy: { checkInTime: 'asc' },
    });

    return NextResponse.json({
      rows: attendance.map((r) => ({
        id: r.id,
        workerName: r.assignment.worker.fullName,
        workerId: r.workerId,
        assignmentId: r.assignmentId,
        checkInTime: r.checkInTime.toISOString(),
        checkOutTime: r.checkOutTime?.toISOString() ?? null,
        checkInLat: r.checkInLat,
        checkInLng: r.checkInLng,
        checkOutLat: r.checkOutLat,
        checkOutLng: r.checkOutLng,
      })),
    });
  } catch (e) {
    console.error('attendance site', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
