import { NextRequest, NextResponse } from 'next/server';

export type UserRole =
  | 'admin'
  | 'product_manager'
  | 'site_manager'
  | 'offer_manager'
  | 'order_manager'
  | 'website_manager'
  | 'sales_agent'
  | 'office_employee'
  | 'worker'
  | 'hr'
  | 'website_user';

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Extract authenticated user info from request headers
 * (Set by the middleware after JWT verification)
 */
export function getAuthUser(request: NextRequest): AuthUser | null {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const role = request.headers.get('x-user-role') as UserRole;

  if (!userId || !email || !role) {
    return null;
  }

  return { userId, email, role };
}

/**
 * Check if user has required role(s)
 */
export function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): { authorized: boolean; user: AuthUser | null; response?: NextResponse } {
  const user = getAuthUser(request);

  if (!user) {
    return {
      authorized: false,
      user: null,
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  if (!allowedRoles.includes(user.role)) {
    return {
      authorized: false,
      user,
      response: NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user };
}

/**
 * Check if user is admin
 */
export function requireAdmin(request: NextRequest) {
  return requireRole(request, ['admin']);
}
