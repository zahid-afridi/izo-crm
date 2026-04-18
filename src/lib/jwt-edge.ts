// JWT utilities compatible with Edge Runtime
import { JWTPayload } from './auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const isDev = process.env.NODE_ENV === 'development';

function debugLog(...args: unknown[]) {
  if (isDev) console.log(...args);
}

// Extract token from Authorization header (Edge-safe, no Node.js deps)
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

// Simple JWT verification for Edge Runtime
export async function verifyTokenEdge(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      debugLog('❌ Edge Token verification - Invalid token format');
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Create expected signature
    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const secretKey = encoder.encode(JWT_SECRET);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const expectedSignature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    const expectedSignatureB64 = btoa(String.fromCharCode(...new Uint8Array(expectedSignature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Compare signatures
    if (signatureB64 !== expectedSignatureB64) {
      debugLog('❌ Edge Token verification - Invalid signature');
      return null;
    }

    // Decode payload
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      debugLog('❌ Edge Token verification - Token expired');
      return null;
    }

    debugLog('✅ Edge Token verification - Success:', {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
    });

    return {
      userId: payload.userId,
      username: payload.username || '',
      email: payload.email,
      role: payload.role,
    };
  } catch (error) {
    debugLog(
      '❌ Edge Token verification - Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return null;
  }
}
