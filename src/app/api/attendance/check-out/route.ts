import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.isValid || !auth.user || auth.user.role !== 'worker') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { assignmentId?: string; lat?: number; lng?: number };
    const { assignmentId, lat, lng } = body;
    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId required' }, { status: 400 });
    }

    const open = await prisma.attendance.findFirst({
      where: {
        assignmentId,
        workerId: auth.user.id,
        checkOutTime: null,
      },
      orderBy: { checkInTime: 'desc' },
    });

    if (!open) {
      return NextResponse.json({ error: 'No open check-in for this assignment' }, { status: 400 });
    }

    const updated = await prisma.attendance.update({
      where: { id: open.id },
      data: {
        checkOutTime: new Date(),
        checkOutLat: lat ?? null,
        checkOutLng: lng ?? null,
      },
    });

    return NextResponse.json({
      id: updated.id,
      checkOutTime: updated.checkOutTime!.toISOString(),
    });
  } catch (e) {
    console.error('check-out', e);
    return NextResponse.json({ error: 'Check-out failed' }, { status: 500 });
  }
}
