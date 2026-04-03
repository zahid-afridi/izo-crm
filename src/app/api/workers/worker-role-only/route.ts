import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET only users with 'worker' role (for assignments and other worker-specific operations)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const includeAssigned = searchParams.get('includeAssigned') === 'true';
    const date = searchParams.get('date');

    const where: any = {
      role: 'worker', // Only users with worker role
      worker: {
        isNot: null, // Must have worker record
      },
    };

    // Filter by worker status
    if (status) {
      where.worker = {
        ...where.worker,
        removeStatus: status,
      };
    } else {
      // Default to active workers only
      where.worker = {
        ...where.worker,
        removeStatus: 'active',
      };
    }

    // Search functionality
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    let workers = await prisma.users.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isLocked: true,
        dateOfBirth: true,
        idNumber: true,
        address: true,
        createdAt: true,
        worker: {
          select: {
            id: true,
            employeeType: true,
            hourlyRate: true,
            monthlyRate: true,
            removeStatus: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    // If date is provided and includeAssigned is false, filter out assigned workers
    if (date && !includeAssigned) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const assignedWorkerIds = await prisma.assignment.findMany({
        where: {
          assignedDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        select: {
          workerId: true,
        },
      });

      const assignedIds = assignedWorkerIds.map(a => a.workerId);
      workers = workers.filter(w => !assignedIds.includes(w.id));
    }

    return NextResponse.json({ workers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching workers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workers' },
      { status: 500 }
    );
  }
}