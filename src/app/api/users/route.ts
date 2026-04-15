import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const role = searchParams.get('role');
    const roles = searchParams.get('roles'); // Support multiple roles
    const status = searchParams.get('status');

    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    } else if (roles) {
      // Support multiple roles separated by comma
      where.role = {
        in: roles.split(',')
      };
    }

    if (status) {
      where.status = status;
    }

    const users = await prisma.users.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        username: true,
        role: true,
        status: true,
        isLocked: true,
        dateOfBirth: true,
        idNumber: true,
        address: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        // Include worker details if they exist
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
      orderBy: { createdAt: 'desc' },
    });

    // Add computed fields
    const usersWithExtras = users.map(user => ({
      ...user,
      hasWorkerRecord: !!user.worker,
      isOnline: user.lastLogin ? 
        (new Date().getTime() - new Date(user.lastLogin).getTime()) < 15 * 60 * 1000 : false, // Online if logged in within 15 minutes
    }));

    return NextResponse.json({ users: usersWithExtras });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
