import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;

    // Fetch worker profile with all related data
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        worker: true
      }
    });

    if (!user || user.role !== 'worker') {
      return NextResponse.json(
        { error: 'Worker profile not found' },
        { status: 404 }
      );
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('Fetching assignments for date range:', { today, tomorrow });

    // Fetch ALL active assignments for the worker (not just today)
    const allActiveAssignments = await prisma.assignment.findMany({
      where: {
        workerId: userId,
        status: 'active'
      },
      include: {
        site: true,
        car: true
      },
      orderBy: {
        assignedDate: 'desc'
      }
    });

    console.log('All active assignments:', allActiveAssignments.length);
    console.log('Assignment dates:', allActiveAssignments.map(a => ({ 
      site: a.site.name, 
      date: a.assignedDate 
    })));

    // Fetch today's assignments
    const todayAssignments = await prisma.assignment.findMany({
      where: {
        workerId: userId,
        status: 'active',
        assignedDate: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        site: true,
        car: true
      }
    });

    console.log('Found today assignments:', todayAssignments.length);

    // Fetch all active assignments (for stats)
    const allAssignments = await prisma.assignment.findMany({
      where: {
        workerId: userId,
        status: 'active'
      }
    });

    // Fetch teams where worker is a member
    const teams = await prisma.team.findMany({
      where: {
        memberIds: {
          has: userId
        },
        status: 'active'
      },
      include: {
        teamLead: {
          select: {
            id: true,
            fullName: true,
            username: true,
            phone: true,
            email: true
          }
        }
      }
    });

    // Fetch team members for each team
    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members = await prisma.users.findMany({
          where: {
            id: {
              in: team.memberIds
            }
          },
          select: {
            id: true,
            fullName: true,
            username: true,
            phone: true,
            email: true,
            role: true
          }
        });

        return {
          ...team,
          members
        };
      })
    );

    // Fetch past assignments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pastAssignments = await prisma.assignment.findMany({
      where: {
        workerId: userId,
        assignedDate: {
          gte: thirtyDaysAgo,
          lt: today
        }
      },
      include: {
        site: true
      },
      orderBy: {
        assignedDate: 'desc'
      },
      take: 10
    });

    // Calculate stats
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisMonthAssignments = await prisma.assignment.count({
      where: {
        workerId: userId,
        assignedDate: {
          gte: thisMonthStart,
          lt: tomorrow
        }
      }
    });

    return NextResponse.json({
      profile: {
        id: user.id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        profile: user.profile,
        worker: user.worker
      },
      todayAssignments: allActiveAssignments, // Return all active assignments
      stats: {
        totalAssignments: allAssignments.length,
        thisMonthDays: thisMonthAssignments,
        teamsCount: teams.length
      },
      teams: teamsWithMembers,
      pastAssignments
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching worker profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worker profile' },
      { status: 500 }
    );
  }
}
