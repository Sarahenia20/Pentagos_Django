import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require an authenticated user
const protectedPaths = ['/profile', '/community', '/artstudio', '/studio']
// Routes that should be accessible only to guests (redirect authenticated users away)
const guestOnly = ['/login', '/register', '/reset-password']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip middleware for static files, API routes, Next internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const token = req.cookies.get('pentaart_token')?.value

  // Protected routes: if not authenticated, redirect to login
  for (const p of protectedPaths) {
    if (pathname === p || pathname.startsWith(p + '/')) {
      if (!token) {
        const loginUrl = new URL('/login', req.url)
        // preserve originally requested path so we can redirect after login if desired
        loginUrl.searchParams.set('next', pathname)
        return NextResponse.redirect(loginUrl)
      }
      break
    }
  }

  // Guest-only routes: if authenticated, redirect to studio/home
  for (const p of guestOnly) {
    if (pathname === p || pathname.startsWith(p + '/')) {
      if (token) {
        return NextResponse.redirect(new URL('/studio', req.url))
      }
      break
    }
  }

  return NextResponse.next()
}

export const config = {
  // Only run middleware for the routes we care about; keep it small and fast
  matcher: [
    '/profile/:path*',
    '/community/:path*',
    '/artstudio/:path*',
    '/studio/:path*',
    '/login',
    '/register',
    '/reset-password',
  ],
}
