import { NextRequest, NextResponse } from 'next/server';
import { generateToken, verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username, email, role } = body;

    if (!userId || !role || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, role, email' },
        { status: 400 }
      );
    }

    // Generate a test token
    const token = generateToken({
      userId,
      username: username || 'test',
      email,
      role
    });

    // Immediately verify the token
    const verified = verifyToken(token);

    return NextResponse.json({
      message: 'Token test successful',
      token,
      tokenPreview: token.substring(0, 50) + '...',
      verified,
      instructions: {
        testWithCurl: `curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/debug/auth`,
        testInBrowser: 'Use this token in your Authorization header'
      }
    });

  } catch (error) {
    console.error('Token test error:', error);
    return NextResponse.json(
      { error: 'Token test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}