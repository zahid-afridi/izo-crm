import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Extract token from Authorization header
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// Extract user info from request headers (set by middleware)
export function getUserFromHeaders(headers: Headers): JWTPayload | null {
  const userId = headers.get('x-user-id');
  const role = headers.get('x-user-role');
  const email = headers.get('x-user-email');
  
  if (!userId || !role || !email) {
    return null;
  }
  
  return {
    userId,
    username: '', // Username not passed in headers, can be fetched from DB if needed
    email,
    role
  };
}

// Verify authentication from request
export async function verifyAuth(request: NextRequest): Promise<{
  isValid: boolean;
  user: { id: string; email: string; role: string } | null;
}> {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const role = request.headers.get('x-user-role');

  if (!userId || !email || !role) {
    return { isValid: false, user: null };
  }

  return {
    isValid: true,
    user: { id: userId, email, role }
  };
}

