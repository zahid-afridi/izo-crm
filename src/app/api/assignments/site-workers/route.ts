import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

/**
 * GET - List workers assigned to a site on a given date.
 * Workers can only call this if they have showAssignmentHistory enabled.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');
    const dateParam = searchParams.get('date');
    const isAll = !dateParam || dateParam === 'all';

    if (!siteId) {
      return NextResponse.json(
        { error: 'siteId is required' },
        { status: 400 }
      );
    }

    const userRole = authResult.user.role;

    if (userRole === 'worker') {
      const allowed = await prisma.assignment.findFirst({
        where: {
          siteId,
          workerId: authResult.user.id,
          status: 'active',
          showAssignmentHistory: true,
        },
      });
      if (!allowed) {
        return NextResponse.json(
          { error: 'You do not have permission to view workers on this site' },
          { status: 403 }
        );
      }
    }

    if (isAll) {
      const assignments = await prisma.assignment.findMany({
        where: { siteId, status: 'active' },
        include: {
          worker: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      });
      const seen = new Set<string>();
      const workers = assignments
        .filter((a) => {
          if (seen.has(a.worker.id)) return false;
          seen.add(a.worker.id);
          return true;
        })
        .map((a) => ({
          id: a.worker.id,
          fullName: a.worker.fullName,
          email: a.worker.email,
          phone: a.worker.phone,
          assignmentId: a.id,
        }));
      return NextResponse.json(
        { workers, date: null, filter: 'all' },
        { status: 200 }
      );
    }

    const targetDate = new Date(dateParam);
    targetDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const assignments = await prisma.assignment.findMany({
      where: {
        siteId,
        status: 'active',
        assignedDate: {
          gte: targetDate,
          lt: endOfDay,
        },
      },
      include: {
        worker: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const workers = assignments.map((a) => ({
      id: a.worker.id,
      fullName: a.worker.fullName,
      email: a.worker.email,
      phone: a.worker.phone,
      assignmentId: a.id,
    }));

    return NextResponse.json(
      { workers, date: targetDate.toISOString().slice(0, 10), filter: 'day' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching site workers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site workers' },
      { status: 500 }
    );
  }
}
