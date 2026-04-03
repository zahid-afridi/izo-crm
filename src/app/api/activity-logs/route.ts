import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const module = searchParams.get('module');
    const userId = searchParams.get('userId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};

    if (action) where.action = action;
    if (module) where.module = module;
    if (userId) where.userId = userId;
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) {
        // Parse the date string (YYYY-MM-DD) and set to start of day UTC
        const fromDate = new Date(dateFrom + 'T00:00:00Z');
        where.timestamp.gte = fromDate;
        console.log('Date from (UTC):', fromDate.toISOString());
      }
      if (dateTo) {
        // Parse the date string (YYYY-MM-DD) and set to end of day UTC
        const toDate = new Date(dateTo + 'T23:59:59.999Z');
        where.timestamp.lte = toDate;
        console.log('Date to (UTC):', toDate.toISOString());
      }
    }

    console.log('Fetching activity logs with filter:', where);

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
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
        take: limit,
        skip: offset,
      }),
      prisma.activityLog.count({ where }),
    ]);

    console.log('Found logs:', total);

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      action,
      module,
      description,
      entityId,
      entityType,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
    } = body;

    if (!userId || !action || !module || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const log = await prisma.activityLog.create({
      data: {
        userId,
        action,
        module,
        description,
        entityId: entityId || null,
        entityType: entityType || null,
        oldValues: oldValues || null,
        newValues: newValues || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
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
    });

    return NextResponse.json(
      { message: 'Activity log created', log },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating activity log:', error);
    return NextResponse.json(
      { error: 'Failed to create activity log' },
      { status: 500 }
    );
  }
}
