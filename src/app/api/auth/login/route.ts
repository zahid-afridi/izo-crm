import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json({ error: 'VALIDATION_REQUIRED' }, { status: 400 });
    }

    // Find user by email (include worker for removeStatus check)
    const user = await prisma.users.findUnique({
      where: { email },
      include: { worker: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 401 });
    }

    // Check if user is disabled
    if (user.status === 'disabled') {
      return NextResponse.json({ error: 'ACCOUNT_DISABLED' }, { status: 403 });
    }

    // Check if user (worker) status is removed
    if (user.worker?.removeStatus === 'removed') {
      return NextResponse.json({ error: 'WORKER_REMOVED' }, { status: 403 });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'INVALID_PASSWORD' }, { status: 401 });
    }

    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Log activity - User login
    try {
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'Unknown';
      const userAgent = request.headers.get('user-agent') || 'Unknown';

      console.log('Logging login activity for user:', user.id);

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'login',
          module: 'Authentication',
          description: `User logged in from ${ipAddress}`,
          ipAddress,
          userAgent,
        },
      });

      console.log('Login activity logged successfully');
    } catch (logError) {
      console.error('Error logging activity:', logError);
      // Don't fail the login if activity logging fails
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    // Create response with HTTP-only cookie
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: userWithoutPassword,
        token // Still return token for backward compatibility
      },
      { status: 200 }
    );

    // Set HTTP-only cookie for secure authentication (token only)
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    });

    // Remove role cookie - we'll extract role from token at runtime
    // response.cookies.set('user-role', user.role.toLowerCase(), {
    //   httpOnly: true,
    //   path: '/',
    //   sameSite: 'lax',
    // });

    console.log('✅ Login successful - Token generated for user:', {
      userId: user.id,
      role: user.role,
      tokenPreview: token.substring(0, 30) + '...'
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
