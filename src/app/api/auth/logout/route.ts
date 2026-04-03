import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId } = body;

    // Log activity - User logout
    if (userId) {
      try {
        const ipAddress = request.headers.get('x-forwarded-for') || 
                         request.headers.get('x-real-ip') || 
                         'Unknown';
        const userAgent = request.headers.get('user-agent') || 'Unknown';

        console.log('Logging logout activity for user:', userId);

        await prisma.activityLog.create({
          data: {
            userId,
            action: 'logout',
            module: 'Authentication',
            description: `User logged out from ${ipAddress}`,
            ipAddress,
            userAgent,
          },
        });

        console.log('Logout activity logged successfully');
      } catch (logError) {
        console.error('Error logging logout activity:', logError);
        // Don't fail the logout if activity logging fails
      }
    }

    // Clear the auth token cookie
    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    // Clear all auth-related cookies
    response.cookies.delete('auth-token');
    response.cookies.delete('user-role');
    response.cookies.delete('session');

    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

// Add GET method for cases where logout is called without method specification
export async function GET(request: NextRequest) {
  try {
    // Clear the auth token cookie
    const response = NextResponse.json(
      { message: 'Logout successful' },
      { status: 200 }
    );

    // Clear all auth-related cookies
    response.cookies.delete('auth-token');
    response.cookies.delete('user-role');
    response.cookies.delete('session');

    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
