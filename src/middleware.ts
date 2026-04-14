import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { extractToken, verifyTokenEdge } from '@/lib/jwt-edge'

/**
 * Public pages
 */
const PUBLIC_PAGES = [
  '/auth/login',
  '/auth/register',
  '/403',
]

/**
 * Public APIs
 */
const PUBLIC_APIS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/me',
  '/api/settings/branding',
  '/api/debug/auth', // Debug endpoint
  '/api/debug/token-test', // Token test endpoint
]

/**
 * Role-based access
 */
const ROLE_ACCESS: Record<string, { pages: string[]; apis: string[]; home: string }> = {
  worker: {
  pages: ['/workers','/chat'],
    apis: ["*"],
    home: '/workers',
  },
  product_manager:{
    pages:['/products',"/chat"],
    apis:["*"],
    home:"/products"
  },
    site_manager:{
    pages:['/sites','/assignments','/cars','/teams','/chat'],
    apis:["*"],
    home:"/sites"
  },
  offer_manager:{
    pages:['/offers','/service-packages','/clients','/products','/chat'],
    apis:["*"],
    home:"/offers"
  },
    sales_agent:{
    pages:['/products','/clients','/orders','/chat'],
    apis:["*"],
    home:"/orders"
  },
      order_manager:{
    pages:['/orders','/clients','/products','/chat','/team-management','/order-management'],
    apis:["*"],
    home:"/orders"
  },
  office_employee:{
    pages:['/orders','/chat'],
    apis:["*"],
    home:"/orders"
  },
  website_manager:{
    pages:['/website-manager'],
    apis:["*"],
    home:"/website-manager"
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isApi = pathname.startsWith('/api')

  // ─────────────────────────────────
  // 1️⃣ Public API routes (always allow)
  // ─────────────────────────────────
  if (PUBLIC_APIS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // ─────────────────────────────────
  //  2️⃣ Auth tokens (extract role from token only)
  // ─────────────────────────────────
  let token: string | undefined = req.cookies.get('auth-token')?.value
  let role: string | undefined = undefined

  console.log('🔍 Middleware Debug - Initial auth check:', {
    pathname,
    hasCookieToken: !!token,
    hasAuthHeader: !!req.headers.get('authorization')
  })

  // If token exists in cookies, extract role from it
  if (token) {
    const payload = await verifyTokenEdge(token)
    if (payload) {
      role = payload.role.toLowerCase()
      console.log('✅ Middleware Debug - Token from cookie:', {
        userId: payload.userId,
        role: payload.role,
        email: payload.email
      })
    }
  }

  // If no token in cookies, check Authorization header
  if (!token) {
    const authHeader = req.headers.get('authorization')
    const headerToken = extractToken(authHeader)
    
    // If token found in header, extract role from token
    if (headerToken) {
      token = headerToken
      const payload = await verifyTokenEdge(headerToken)
      if (payload) {
        role = payload.role.toLowerCase()
        console.log('✅ Middleware Debug - Token from header:', {
          userId: payload.userId,
          role: payload.role,
          email: payload.email
        })
      } else {
        console.log('❌ Middleware Debug - Invalid token from header')
      }
    }
  }

  // ─────────────────────────────────
  // 3️⃣ Handle auth pages (login/register)
  // ─────────────────────────────────
  if (PUBLIC_PAGES.some(p => pathname.startsWith(p))) {
    // If user is already authenticated, redirect to dashboard
    if (token && role) {
      console.log('🔄 Middleware Debug - Authenticated user accessing auth page, redirecting to dashboard')
      
      // Redirect to role-specific home page or dashboard
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      } else if (ROLE_ACCESS[role]) {
        return NextResponse.redirect(new URL(ROLE_ACCESS[role].home, req.url))
      } else {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
    // If not authenticated, allow access to auth pages
    return NextResponse.next()
  }

  // ─────────────────────────────────
  // 4️⃣ Not logged in - redirect to login
  // ─────────────────────────────────
  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // ─────────────────────────────────
  // 5️⃣ Admin → full access (except team-management and order-management)
  // ─────────────────────────────────
  if (role === 'admin') {
    // Restrict admin access to team-management and order-management pages (only for order_manager)
    if (pathname.startsWith('/team-management') || pathname.startsWith('/order-management')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    
    if (isApi) {
      // Pass user info to API routes via headers for admin
      const response = NextResponse.next()
      if (token) {
        const payload = await verifyTokenEdge(token)
        if (payload) {
          response.headers.set('x-user-id', payload.userId)
          response.headers.set('x-user-role', payload.role)
          response.headers.set('x-user-email', payload.email)
          console.log('✅ Middleware Debug - Setting headers for admin API access:', {
            userId: payload.userId,
            role: payload.role,
            email: payload.email
          })
        }
      }
      return response
    }
    return NextResponse.next()
  }

  // ─────────────────────────────────
  // 5b️⃣ Settings page — administrators only
  // ─────────────────────────────────
  if (!isApi && pathname.startsWith('/settings') && role && role !== 'admin') {
    const home = ROLE_ACCESS[role]?.home ?? '/dashboard'
    return NextResponse.redirect(new URL(home, req.url))
  }

  // ─────────────────────────────────
  // 6️⃣ Invalid role
  // ─────────────────────────────────
  if (!role || !ROLE_ACCESS[role]) {
    console.log('🚨 Middleware Debug - Invalid role:', {
      pathname,
      role,
      availableRoles: Object.keys(ROLE_ACCESS),
      hasToken: !!token,
      isApi
    })
    
    if (isApi) {
      return NextResponse.json({ 
        error: 'Forbidden', 
        debug: { role, availableRoles: Object.keys(ROLE_ACCESS) }
      }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/403', req.url))
  }

  const { pages, apis, home } = ROLE_ACCESS[role]

  // Profile page — any authenticated non-admin role (admin already passes above)
  if (!isApi && pathname.startsWith('/profile')) {
    return NextResponse.next()
  }

  // ─────────────────────────────────
  // 7️⃣ API access
  // ─────────────────────────────────
if (isApi) {
  const allowed =
    apis.includes('*') || // ✅ allow all APIs
    apis.some(api => pathname.startsWith(api))

  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Pass user info to API routes via headers
  const response = NextResponse.next()
  if (token) {
    const payload = await verifyTokenEdge(token)
    if (payload) {
      response.headers.set('x-user-id', payload.userId)
      response.headers.set('x-user-role', payload.role)
      response.headers.set('x-user-email', payload.email)
    }
  }
  
  return response
}

  // ─────────────────────────────────
  // 8️⃣ PAGE access
  // ─────────────────────────────────
  const allowed = pages.some(page => pathname.startsWith(page))
  if (!allowed) {
    // 🔁 redirect worker to their allowed home page
    return NextResponse.redirect(new URL(home, req.url))
  }

  return NextResponse.next()
}

/**
 * Middleware matcher
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
