import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get all activity logs without any filters
    const allLogs = await prisma.activityLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // Get count by action
    const actionCounts = await prisma.activityLog.groupBy({
      by: ['action'],
      _count: true,
    });

    // Get count by module
    const moduleCounts = await prisma.activityLog.groupBy({
      by: ['module'],
      _count: true,
    });

    // Get total count
    const totalCount = await prisma.activityLog.count();

    // Get logs from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logsLast24h = await prisma.activityLog.count({
      where: {
        timestamp: {
          gte: oneDayAgo,
        },
      },
    });

    console.log('Debug info:', {
      totalCount,
      logsLast24h,
      actionCounts,
      moduleCounts,
      recentLogs: allLogs.slice(0, 5),
    });

    return NextResponse.json({
      totalCount,
      logsLast24h,
      actionCounts,
      moduleCounts,
      recentLogs: allLogs.slice(0, 10),
      allLogs,
    });
  } catch (error) {
    console.error('Error fetching debug info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug info', details: String(error) },
      { status: 500 }
    );
  }
}
