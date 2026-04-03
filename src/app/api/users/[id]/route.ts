import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth-middleware';
import { logActivity } from '@/lib/activity-logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = requireRole(request, ['admin', 'site_manager', 'offer_manager', 'order_manager']);
    if (!auth.authorized) return auth.response!;

    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        dateOfBirth: true,
        idNumber: true,
        address: true,
        role: true,
        status: true,
        isLocked: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = requireRole(request, ['admin', 'order_manager']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const {
      fullName,
      phone,
      role,
      status,
      dateOfBirth,
      idNumber,
      address,
    } = body;

    const user = await prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If order_manager, only allow editing sales_agent and office_employee
    if (auth.user!.role === 'order_manager') {
      if (!['sales_agent', 'office_employee'].includes(user.role)) {
        return NextResponse.json(
          { error: 'You can only edit sales agents and office employees' },
          { status: 403 }
        );
      }
      
      // Order managers cannot change user roles
      if (role && role !== user.role) {
        return NextResponse.json(
          { error: 'You cannot change user roles' },
          { status: 403 }
        );
      }
    }

    // Track changes for audit
    const changes: Record<string, any> = {};
    if (fullName && fullName !== user.fullName) changes.fullName = { from: user.fullName, to: fullName };
    if (phone && phone !== user.phone) changes.phone = { from: user.phone, to: phone };
    if (role && role !== user.role) changes.role = { from: user.role, to: role };
    if (status && status !== user.status) changes.status = { from: user.status, to: status };

    const updatedUser = await prisma.users.update({
      where: { id },
      data: {
        ...(fullName && { fullName }),
        ...(phone && { phone }),
        ...(role && auth.user!.role === 'admin' && { role: role as any }), // Only admin can change roles
        ...(status && { status: status as any }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(idNumber && { idNumber }),
        ...(address && { address }),
      },
    });

    // Log the action
    if (Object.keys(changes).length > 0) {
      await logActivity({
        userId: auth.user!.userId,
        action: 'update',
        module: 'users',
        resourceId: id,
        resourceName: user.fullName,
        description: `Updated user: ${user.fullName}`,
        changes,
      });
    }

    const { password: _, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = requireRole(request, ['admin']);
    if (!auth.authorized) return auth.response!;

    const user = await prisma.users.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Soft delete by disabling the user
    const deletedUser = await prisma.users.update({
      where: { id },
      data: { status: 'disabled' },
    });

    // Log the action
    await logActivity({
      userId: auth.user!.userId,
      action: 'delete',
      module: 'users',
      
      resourceId: id,
      resourceName: user.fullName,
      description: `Deleted (disabled) user: ${user.fullName}`,
    });

    const { password: _, ...userWithoutPassword } = deletedUser;
    return NextResponse.json(userWithoutPassword, { status: 200 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
