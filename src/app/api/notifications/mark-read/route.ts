import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

// PATCH /api/notifications/mark-read - mark notifications as read for current user
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);

    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const ids: string[] | undefined = body.ids;
    const markAll: boolean = body.markAll === true;

    const now = new Date();

    if (markAll) {
      await prisma.notification.updateMany({
        where: {
          userId: authResult.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: now,
        },
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids array or markAll flag is required' },
        { status: 400 }
      );
    }

    await prisma.notification.updateMany({
      where: {
        userId: authResult.user.id,
        id: { in: ids },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

