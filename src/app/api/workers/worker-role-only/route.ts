import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeWorkerRemoveStatus } from '@/lib/workerRemoveStatus';

// GET only users with 'worker' role
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status');
    const status = rawStatus ? normalizeWorkerRemoveStatus(rawStatus) : null;
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
            dailyRate: true,
            extraHourRate: true,
            removeStatus: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    // Assignment module removed: keep legacy params accepted for compatibility.
    void includeAssigned;
    void date;

    return NextResponse.json({ workers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching workers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workers' },
      { status: 500 }
    );
  }
}