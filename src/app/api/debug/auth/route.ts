import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken, getUserFromHeaders } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const debug: any = {
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method,
    };

    // Check cookies
    const cookieToken = request.cookies.get('auth-token')?.value;
    const cookieRole = request.cookies.get('user-role')?.value;
    debug.cookies = {
      hasAuthToken: !!cookieToken,
      role: cookieRole,
      tokenPreview: cookieToken ? `${cookieToken.substring(0, 20)}...` : null
    };

    // Check Authorization header
    const authHeader = request.headers.get('authorization');
    const headerToken = extractToken(authHeader);
    debug.authHeader = {
      present: !!authHeader,
      validFormat: authHeader?.startsWith('Bearer '),
      hasToken: !!headerToken,
      tokenPreview: headerToken ? `${headerToken.substring(0, 20)}...` : null
    };

    // Check middleware headers
    debug.middlewareHeaders = {
      userId: request.headers.get('x-user-id'),
      role: request.headers.get('x-user-role'),
      email: request.headers.get('x-user-email')
    };

    // Try to get user from headers
    const userFromHeaders = getUserFromHeaders(request.headers);
    debug.userFromHeaders = userFromHeaders;

    // Try to verify tokens
    if (cookieToken) {
      const cookiePayload = verifyToken(cookieToken);
      debug.cookieTokenValid = !!cookiePayload;
      if (cookiePayload) {
        debug.cookiePayload = {
          userId: cookiePayload.userId,
          role: cookiePayload.role,
          email: cookiePayload.email
        };
      }
    }

    if (headerToken) {
      const headerPayload = verifyToken(headerToken);
      debug.headerTokenValid = !!headerPayload;
      if (headerPayload) {
        debug.headerPayload = {
          userId: headerPayload.userId,
          role: headerPayload.role,
          email: headerPayload.email
        };
      }
    }

    return NextResponse.json({ debug }, { status: 200 });
  } catch (error) {
    console.error('Debug auth error:', error);
    return NextResponse.json(
      { error: 'Debug endpoint error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}