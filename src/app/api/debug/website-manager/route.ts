import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request);
    
    return NextResponse.json({
      success: true,
      debug: {
        user,
        headers: {
          'x-user-id': request.headers.get('x-user-id'),
          'x-user-email': request.headers.get('x-user-email'),
          'x-user-role': request.headers.get('x-user-role'),
        },
        hasAuth: !!user,
        isAdmin: user?.role === 'admin',
        isWebsiteManager: user?.role === 'website_manager',
        allowedRoles: ['admin', 'website_manager'],
        userRole: user?.role
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        headers: {
          'x-user-id': request.headers.get('x-user-id'),
          'x-user-email': request.headers.get('x-user-email'),
          'x-user-role': request.headers.get('x-user-role'),
        }
      }
    });
  }
}