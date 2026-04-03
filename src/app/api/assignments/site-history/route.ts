import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';

/**
 * GET - Last 7 days worker count per day for a site.
 * Persists snapshot into AssignmentSiteHistory for stored history.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin', 'site_manager', 'order_manager', 'worker']);
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId is required' },
        { status: 400 }
      );
    }

    const site = await prisma.site.findUnique({
      where: { id: siteId },
    });
    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: string; dateLabel: string; workerCount: number }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const count = await prisma.assignment.count({
        where: {
          siteId,
          status: 'active',
          assignedDate: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      });

      const dateStr = startOfDay.toISOString().slice(0, 10);
      days.push({
        date: dateStr,
        dateLabel: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : startOfDay.toLocaleDateString(),
        workerCount: count,
      });

      await prisma.assignmentSiteHistory.upsert({
        where: {
          siteId_date: { siteId, date: startOfDay },
        },
        create: {
          siteId,
          date: startOfDay,
          workerCount: count,
        },
        update: { workerCount: count },
      });
    }

    return NextResponse.json(
      { history: days },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching site assignment history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site history' },
      { status: 500 }
    );
  }
}
