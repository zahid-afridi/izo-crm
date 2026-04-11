import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all available site managers
export async function GET(request: NextRequest) {
  try {
    const managers = await prisma.users.findMany({
      where: {
        role: 'site_manager',
        status: 'active',
        // Exclude managers whose worker employment status is disabled
        OR: [
          {
            worker: {
              removeStatus: {
                not: 'disabled',
              },
            },
          },
          // Also include managers without a worker record (defensive, in case they exist)
          {
            worker: {
              is: null,
            },
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        worker: {
          select: {
            removeStatus: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    });

    return NextResponse.json({ managers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching site managers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site managers' },
      { status: 500 }
    );
  }
}
