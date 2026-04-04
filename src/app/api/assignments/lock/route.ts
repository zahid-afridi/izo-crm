import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/assignments/lock
 * Unified lock/unlock for workers and cars.
 * Body: { type: 'worker' | 'car', ids: string[], isLocked: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ids, isLocked } = body;

    if (!type || !['worker', 'car'].includes(type)) {
      return NextResponse.json({ error: 'type must be "worker" or "car"' }, { status: 400 });
    }
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }
    if (typeof isLocked !== 'boolean') {
      return NextResponse.json({ error: 'isLocked must be a boolean' }, { status: 400 });
    }

    const uniqueIds = [...new Set(ids)].filter(Boolean);

    if (type === 'worker') {
      const result = await prisma.users.updateMany({
        where: { id: { in: uniqueIds }, role: 'worker' },
        data: { isLocked },
      });
      return NextResponse.json({
        message: `${result.count} worker(s) ${isLocked ? 'locked' : 'unlocked'}`,
        updated: result.count,
        type,
        isLocked,
      });
    }

    // type === 'car'
    const result = await prisma.car.updateMany({
      where: { id: { in: uniqueIds } },
      data: { isLocked },
    });
    return NextResponse.json({
      message: `${result.count} car(s) ${isLocked ? 'locked' : 'unlocked'}`,
      updated: result.count,
      type,
      isLocked,
    });
  } catch (error: any) {
    console.error('Error in assignments/lock:', error);
    return NextResponse.json({ error: 'Failed to update lock status' }, { status: 500 });
  }
}
