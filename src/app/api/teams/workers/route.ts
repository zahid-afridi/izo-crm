import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// GET /api/teams/workers - Get all workers (role='worker')
export async function GET(request: NextRequest) {
  try {
    const workers = await prisma.users.findMany({
      where: {
        role: 'worker',
        status: 'active',
        isLocked: false,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
      },
      orderBy: { fullName: 'asc' },
    });

    return NextResponse.json({ workers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching workers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workers' },
      { status: 500 }
    );
  }
}
