import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { logActivity } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const auth = requireRole(request, ['admin', 'order_manager']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If order_manager, only allow locking sales_agent and office_employee
    if (auth.user!.role === 'order_manager') {
      if (!['sales_agent', 'office_employee'].includes(user.role)) {
        return NextResponse.json(
          { error: 'You can only lock sales agents and office employees' },
          { status: 403 }
        );
      }
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { isLocked: true }
    });

    // Log the action
    await logActivity({
      userId: auth.user!.userId,
      action: 'lock',
      module: 'users',
      resourceId: userId,
      resourceName: user.fullName,
      description: `Locked user account: ${user.fullName}`,
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    console.error('Error locking user:', error);
    return NextResponse.json(
      { error: 'Failed to lock user' },
      { status: 500 }
    );
  }
}
