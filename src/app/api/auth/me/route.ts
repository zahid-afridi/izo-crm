import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractToken, getUserFromHeaders } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    let payload = null;

    // First, try to get user info from headers (set by middleware)
    payload = getUserFromHeaders(request.headers);

    // If not available in headers, try Authorization header or cookie
    if (!payload) {
      const authHeader = request.headers.get('authorization');
      let token = extractToken(authHeader);
      
      // If no token in header, check cookie
      if (!token) {
        token = request.cookies.get('auth-token')?.value || null;
      }

      if (!token) {
        return NextResponse.json(
          { error: 'No token provided' },
          { status: 401 }
        );
      }

      // Verify token
      payload = verifyToken(token);

      if (!payload) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }
    }

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is disabled
    if (user.status === 'disabled') {
      return NextResponse.json(
        { error: 'Account is disabled' },
        { status: 403 }
      );
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { user: userWithoutPassword },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
