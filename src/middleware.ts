import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { JWTPayload } from '@/lib/auth';
import { extractToken, verifyTokenEdge } from '@/lib/jwt-edge';

const isDev = process.env.NODE_ENV === 'development';

function debugLog(...args: unknown[]) {
  if (isDev) console.log(...args);
}

function attachUserHeaders(res: NextResponse, payload: JWTPayload | null) {
  if (payload) {
    res.headers.set('x-user-id', payload.userId);
    res.headers.set('x-user-role', payload.role);
    res.headers.set('x-user-email', payload.email);
  }
  return res;
}

/**
 * Public pages
 */
const PUBLIC_PAGES = ['/auth/login', '/auth/register', '/403'];

/**
 * Public APIs
 */
const PUBLIC_APIS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/me',
  '/api/settings/branding',
  '/api/debug/auth',
  '/api/debug/token-test',
];

/**
 * Role-based access
 */
const ROLE_ACCESS: Record<
  string,
  { pages: string[]; apis: string[]; home: string }
> = {
  worker: {
    pages: ['/workers', '/my-assignments', '/chat', '/attendance'],
    apis: ['*'],
    home: '/my-assignments',
  },
  product_manager: {
    pages: ['/products', '/chat', '/attendance'],
    apis: ['*'],
    home: '/products',
  },
  site_manager: {
    pages: ['/sites', '/cars', '/assignments', '/teams', '/chat', '/attendance'],
    apis: ['*'],
    home: '/assignments',
  },
  offer_manager: {
    pages: ['/offers', '/service-packages', '/clients', '/products', '/chat', '/attendance'],
    apis: ['*'],
    home: '/offers',
  },
  sales_agent: {
    pages: ['/products', '/clients', '/orders', '/chat', '/attendance'],
    apis: ['*'],
    home: '/orders',
  },
  order_manager: {
    pages: [
      '/orders',
      '/clients',
      '/products',
      '/chat',
      '/team-management',
      '/order-management',
      '/attendance',
    ],
    apis: ['*'],
    home: '/orders',
  },
  office_employee: {
    pages: ['/orders', '/chat', '/attendance'],
    apis: ['*'],
    home: '/orders',
  },
  website_manager: {
    pages: ['/website-manager', '/attendance'],
    apis: ['*'],
    home: '/website-manager',
  },
  hr: {
    pages: ['/workers', '/chat', '/attendance'],
    apis: ['*'],
    home: '/workers',
  },
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith('/api');

  if (PUBLIC_APIS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Single JWT verification per request (was 2–3× before)
  let token: string | undefined = req.cookies.get('auth-token')?.value;
  let payload: JWTPayload | null = null;

  if (token) {
    payload = await verifyTokenEdge(token);
  } else {
    const headerToken = extractToken(req.headers.get('authorization'));
    if (headerToken) {
      token = headerToken;
      payload = await verifyTokenEdge(headerToken);
    }
  }

  const role = payload?.role?.toLowerCase();

  debugLog('🔍 Middleware:', {
    pathname,
    hasToken: !!token,
    hasPayload: !!payload,
    role: role ?? null,
  });

  if (PUBLIC_PAGES.some((p) => pathname.startsWith(p))) {
    if (token && role) {
      debugLog('🔄 Authenticated user on auth page → redirect home');
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      if (ROLE_ACCESS[role]) {
        return NextResponse.redirect(new URL(ROLE_ACCESS[role].home, req.url));
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/auth/login', req.url));
  }

  if (role === 'admin') {
    if (pathname.startsWith('/team-management') || pathname.startsWith('/order-management')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    if (isApi) {
      return attachUserHeaders(NextResponse.next(), payload);
    }
    return NextResponse.next();
  }

  if (!isApi && pathname.startsWith('/settings') && role && role !== 'admin') {
    const home = ROLE_ACCESS[role]?.home ?? '/dashboard';
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (!role || !ROLE_ACCESS[role]) {
    debugLog('🚨 Invalid role for route', { pathname, role });
    if (isApi) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/403', req.url));
  }

  const { pages, apis, home } = ROLE_ACCESS[role];

  if (!isApi && pathname.startsWith('/profile')) {
    return NextResponse.next();
  }

  if (isApi) {
    const allowed = apis.includes('*') || apis.some((api) => pathname.startsWith(api));
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return attachUserHeaders(NextResponse.next(), payload);
  }

  const allowed = pages.some((page) => pathname.startsWith(page));
  if (!allowed) {
    return NextResponse.redirect(new URL(home, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Skip static assets and common file extensions to reduce Edge invocations.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?)$).*)',
  ],
};
