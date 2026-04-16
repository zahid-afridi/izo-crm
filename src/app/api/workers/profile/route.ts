import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { worker: true },
    });

    if (!user || user.role !== 'worker') {
      return NextResponse.json({ error: 'Worker profile not found' }, { status: 404 });
    }

    const teams = await prisma.team.findMany({
      where: {
        memberIds: { has: userId },
        status: 'active',
      },
      include: {
        teamLead: {
          select: { id: true, fullName: true, username: true, phone: true, email: true },
        },
      },
    });

    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members = await prisma.users.findMany({
          where: { id: { in: team.memberIds } },
          select: {
            id: true,
            fullName: true,
            username: true,
            phone: true,
            email: true,
            role: true,
          },
        });
        return { ...team, members };
      })
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayAttendance, monthlyAttendance] = await Promise.all([
      prisma.employeeAttendance.findMany({
        where: {
          userId,
          attendanceDate: { gte: today, lt: tomorrow },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employeeAttendance.count({
        where: {
          userId,
          attendanceDate: { gte: thisMonthStart, lt: tomorrow },
          checkInTime: { not: null },
        },
      }),
    ]);

    return NextResponse.json(
      {
        profile: {
          id: user.id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          phone: user.phone,
          profile: user.profile,
          worker: user.worker,
        },
        todayAttendance,
        stats: {
          totalAttendanceRecords: monthlyAttendance,
          thisMonthDays: monthlyAttendance,
          teamsCount: teams.length,
        },
        teams: teamsWithMembers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching worker profile:', error);
    return NextResponse.json({ error: 'Failed to fetch worker profile' }, { status: 500 });
  }
}
