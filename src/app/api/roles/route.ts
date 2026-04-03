import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { rolePermissions, getRoleInfo, getMenuItems } from '@/config/rolePermissions';

/**
 * GET all roles with their permissions
 */
export async function GET(request: NextRequest) {
  try {
    const auth = requireAdmin(request);
    if (!auth.authorized) return auth.response!;

    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get('roleId');

    if (roleId) {
      // Get specific role
      const role = getRoleInfo(roleId);
      if (!role) {
        return NextResponse.json(
          { error: 'Role not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          role,
          menuItems: getMenuItems(roleId),
        },
        { status: 200 }
      );
    }

    // Get all roles
    const roles = Object.values(rolePermissions).map((role) => ({
      ...role,
      menuItems: getMenuItems(role.role),
    }));

    return NextResponse.json({ roles }, { status: 200 });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}
