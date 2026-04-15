import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromHeaders, verifyToken, extractToken } from '@/lib/auth';
import { normalizeWorkerRemoveStatus } from '@/lib/workerRemoveStatus';

function parseOptionalRate(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// POST - Create worker record for existing user
export async function POST(request: NextRequest) {
  try {
    let payload = null;

    // Authentication check
    payload = getUserFromHeaders(request.headers);

    if (!payload) {
      const authHeader = request.headers.get('authorization');
      let token = extractToken(authHeader);
      
      if (!token) {
        token = request.cookies.get('auth-token')?.value || null;
      }

      if (!token) {
        return NextResponse.json(
          { error: 'No token provided' },
          { status: 401 }
        );
      }

      payload = verifyToken(token);

      if (!payload) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const { userId, employeeType, hourlyRate, monthlyRate, dailyRate, extraHourRate, removeStatus } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { worker: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if worker record already exists
    if (user.worker) {
      return NextResponse.json(
        { error: 'Worker record already exists for this user' },
        { status: 400 }
      );
    }

    // Create worker record
    const worker = await prisma.$transaction(async (tx) => {
      const newWorker = await tx.worker.create({
        data: {
          userId: userId,
          employeeType: employeeType || 'full-time',
          hourlyRate: parseOptionalRate(hourlyRate),
          monthlyRate: parseOptionalRate(monthlyRate),
          dailyRate: parseOptionalRate(dailyRate),
          extraHourRate: parseOptionalRate(extraHourRate),
          removeStatus: normalizeWorkerRemoveStatus(removeStatus || 'active'),
        },
      });

      // Log activity
      try {
        const ipAddress = request.headers.get('x-forwarded-for') || 
                         request.headers.get('x-real-ip') || 
                         'Unknown';
        const userAgent = request.headers.get('user-agent') || 'Unknown';

        await tx.activityLog.create({
          data: {
            userId: payload.userId,
            action: 'create',
            module: 'Workers',
            description: `Created worker record for "${user.fullName || user.username}"`,
            entityId: userId,
            entityType: 'Worker',
            ipAddress,
            userAgent,
            newValues: {
              employeeType: employeeType || 'full-time',
              hourlyRate: parseOptionalRate(hourlyRate),
              monthlyRate: parseOptionalRate(monthlyRate),
              dailyRate: parseOptionalRate(dailyRate),
              extraHourRate: parseOptionalRate(extraHourRate),
              removeStatus: normalizeWorkerRemoveStatus(removeStatus || 'active'),
            },
          },
        });
      } catch (logError) {
        console.error('Error logging activity:', logError);
      }

      return newWorker;
    });

    return NextResponse.json({
      message: 'Worker record created successfully',
      worker: {
        id: worker.id,
        userId: worker.userId,
        employeeType: worker.employeeType,
        hourlyRate: worker.hourlyRate,
        monthlyRate: worker.monthlyRate,
        dailyRate: worker.dailyRate,
        extraHourRate: worker.extraHourRate,
        removeStatus: worker.removeStatus
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating worker record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}