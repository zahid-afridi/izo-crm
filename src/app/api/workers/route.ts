import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { encryptPassword } from '@/lib/password-utils';
import { normalizeWorkerRemoveStatus } from '@/lib/workerRemoveStatus';

function parseOptionalRate(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// GET all users (display all users regardless of role)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status');
    const status =
      rawStatus && rawStatus !== 'all'
        ? normalizeWorkerRemoveStatus(rawStatus)
        : null;
    const search = searchParams.get('search');
    const role = searchParams.get('role'); // Optional role filter

    const where: any = {
      // Exclude admin users
      role: {
        not: 'admin'
      }
    };

    // Optional role filter (if provided and not admin)
    if (role && role !== 'admin') {
      where.role = role;
    }

    // Optional status filter for worker records ('all' / omitted → status is null)
    if (status) {
      where.worker = {
        removeStatus: status,
      };
    }

    // Search functionality
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    const workers = await prisma.users.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true, // Shows current role (worker, product_manager, admin, etc.)
        isLocked: true,
        dateOfBirth: true,
        idNumber: true,
        address: true,
        username: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        worker: {
          select: {
            id: true,
            employeeType: true,
            hourlyRate: true,
            monthlyRate: true,
            dailyRate: true,
            extraHourRate: true,
            removeStatus: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ workers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      dateOfBirth,
      idNumber,
      address,
      role,
      employeeType,
      removeStatus,
      hourlyRate,
      monthlyRate,
      dailyRate,
      extraHourRate,
      password,
      createdByUserId, // User creating the worker
    } = body;

    console.log('Creating worker with createdByUserId:', createdByUserId);

    // Validate required fields
    if (!fullName || !email || !password || !role) {
      return NextResponse.json(
        { error: 'fullName, email, password, and role are required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and worker in transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.users.create({
        data: {
          username: email.split('@')[0] + '_' + Date.now(),
          email,
          password: hashedPassword,
          profile: encryptPassword(password), // Store encrypted password in profile field
          fullName,
          phone: phone || null,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          idNumber: idNumber || null,
          address: address || null,
          role: role as any,
          status: 'active',
        },
      });

      const worker = await tx.worker.create({
        data: {
          userId: user.id,
          employeeType: employeeType || 'full-time',
          hourlyRate: parseOptionalRate(hourlyRate),
          monthlyRate: parseOptionalRate(monthlyRate),
          dailyRate: parseOptionalRate(dailyRate),
          extraHourRate: parseOptionalRate(extraHourRate),
          removeStatus: normalizeWorkerRemoveStatus(removeStatus || 'active'),
        },
      });

      // Log activity - Worker creation
      if (createdByUserId) {
        try {
          const ipAddress = request.headers.get('x-forwarded-for') || 
                           request.headers.get('x-real-ip') || 
                           'Unknown';
          const userAgent = request.headers.get('user-agent') || 'Unknown';

          console.log('Logging activity for worker creation:', {
            userId: createdByUserId,
            action: 'create',
            module: 'Workers',
            description: `Created new worker "${fullName}" with email ${email}`,
          });

          await tx.activityLog.create({
            data: {
              userId: createdByUserId,
              action: 'create',
              module: 'Workers',
              description: `Created new worker "${fullName}" with email ${email}`,
              entityId: user.id,
              entityType: 'Worker',
              ipAddress,
              userAgent,
              newValues: {
                fullName,
                email,
                employeeType,
                role,
                hourlyRate: parseOptionalRate(hourlyRate),
                monthlyRate: parseOptionalRate(monthlyRate),
                dailyRate: parseOptionalRate(dailyRate),
                extraHourRate: parseOptionalRate(extraHourRate),
              },
            },
          });

          console.log('Activity log created successfully');
        } catch (logError) {
          console.error('Error logging activity:', logError);
          // Don't fail the worker creation if activity logging fails
        }
      } else {
        console.log('No createdByUserId provided, skipping activity logging');
      }

      return { user, worker };
    });

    return NextResponse.json(
      { message: 'Worker created successfully', data: result },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating worker:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create worker' },
      { status: 500 }
    );
  }
}
