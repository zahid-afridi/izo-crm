import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';

/**
 * GET - Fetch showAssignmentHistory for a specific assignment (worker + site).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireRole(request, ['admin', 'site_manager', 'order_manager']);
    if (!auth.authorized) return auth.response!;

    const { id: assignmentId } = await params;
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { showAssignmentHistory: true },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { showAssignmentHistory: assignment.showAssignmentHistory },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching assignment history preference:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history preference' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update showAssignmentHistory for this assignment only (this site, this worker).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireRole(request, ['admin', 'site_manager', 'order_manager']);
    if (!auth.authorized) return auth.response!;

    const { id: assignmentId } = await params;
    const body = await request.json();
    const { showAssignmentHistory } = body;

    if (typeof showAssignmentHistory !== 'boolean') {
      return NextResponse.json(
        { error: 'showAssignmentHistory must be a boolean' },
        { status: 400 }
      );
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: { showAssignmentHistory },
    });

    return NextResponse.json(
      { showAssignmentHistory },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating assignment history preference:', error);
    return NextResponse.json(
      { error: 'Failed to update history preference' },
      { status: 500 }
    );
  }
}
