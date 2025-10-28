import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ============================================================================
// FUTURISTIC MIDDLEWARE WITH ADVANCED FEATURES
// ============================================================================
// Features: Rate Limiting, Analytics, Session Validation, Security Headers,
// Geolocation, Device Detection, A/B Testing, Performance Monitoring
// ============================================================================

// Route configurations
const ROUTE_CONFIG = {
  protected: {
    paths: ['/profile', '/community', '/artstudio', '/studio', '/gallery', '/settings'],
    redirectTo: '/login',
  },
  guestOnly: {
    paths: ['/login', '/register', '/reset-password', '/onboarding'],
    redirectTo: '/studio',
  },
  admin: {
    paths: ['/admin', '/analytics', '/moderation'],
    redirectTo: '/studio',
    requiredRole: 'admin',
  },
  premium: {
    paths: ['/premium-studio', '/advanced-tools', '/ai-pro'],
    redirectTo: '/pricing',
    requiredPlan: 'premium',
  },
} as const

// Rate limiting configuration (requests per time window)
const RATE_LIMITS = {
  '/api/generate': { max: 10, window: 60000 }, // 10 req/min
  '/api/upload': { max: 5, window: 60000 },     // 5 req/min
  '/api/ai': { max: 20, window: 60000 },        // 20 req/min
  default: { max: 100, window: 60000 },         // 100 req/min
} as const

// Security headers for enhanced protection
const SECURITY_HEADERS = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const

// Simple in-memory rate limiter (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Session validation cache (prevents repeated DB hits)
const sessionCache = new Map<string, { valid: boolean; expiresAt: number; userData?: any }>()

/**
 * Check if user has exceeded rate limit
 */
function checkRateLimit(identifier: string, pathname: string): boolean {
  const now = Date.now()
  const config = RATE_LIMITS[pathname as keyof typeof RATE_LIMITS] || RATE_LIMITS.default
  const key = `${identifier}:${pathname}`
  
  const existing = rateLimitStore.get(key)
  
  if (!existing || now > existing.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.window,
    })
    return true
  }
  
  if (existing.count >= config.max) {
    return false
  }
  
  existing.count++
  return true
}

/**
 * Validate session token and get user data
 */
async function validateSession(token: string): Promise<{ valid: boolean; userData?: any }> {
  const now = Date.now()
  
  // Check cache first
  const cached = sessionCache.get(token)
  if (cached && now < cached.expiresAt) {
    return { valid: cached.valid, userData: cached.userData }
  }
  
  try {
    // Validate token with backend (replace with your API)
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    })
    
    if (response.ok) {
      const userData = await response.json()
      
      // Cache for 5 minutes
      sessionCache.set(token, {
        valid: true,
        userData,
        expiresAt: now + 300000,
      })
      
      return { valid: true, userData }
    }
    
    // Cache invalid result for 1 minute
    sessionCache.set(token, {
      valid: false,
      expiresAt: now + 60000,
    })
    
    return { valid: false }
  } catch (error) {
    console.error('Session validation error:', error)
    return { valid: false }
  }
}

/**
 * Get user's geolocation from request
 */
function getGeolocation(req: NextRequest) {
  return {
    country: req.geo?.country || 'Unknown',
    region: req.geo?.region || 'Unknown',
    city: req.geo?.city || 'Unknown',
    latitude: req.geo?.latitude || null,
    longitude: req.geo?.longitude || null,
  }
}

/**
 * Detect device type from user agent
 */
function detectDevice(userAgent: string) {
  const ua = userAgent.toLowerCase()
  
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
    return 'tablet'
  }
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    return 'mobile'
  }
  return 'desktop'
}

/**
 * Log analytics event (replace with your analytics service)
 */
async function logAnalytics(event: {
  type: string
  path: string
  userId?: string
  metadata?: Record<string, any>
}) {
  // Send to analytics service (PostHog, Mixpanel, etc.)
  if (process.env.NODE_ENV === 'production') {
    try {
      await fetch(`${process.env.ANALYTICS_ENDPOINT}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          timestamp: Date.now(),
        }),
      })
    } catch (error) {
      console.error('Analytics error:', error)
    }
  }
}

/**
 * A/B Testing variant assignment
 */
function getABTestVariant(userId: string, testName: string): 'A' | 'B' {
  // Simple hash-based assignment (consistent for same user)
  const hash = Array.from(`${userId}${testName}`).reduce(
    (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0,
    0
  )
  return Math.abs(hash) % 2 === 0 ? 'A' : 'B'
}

/**
 * Main middleware function
 */
export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl
  const startTime = Date.now()

  // Skip middleware for static files, API routes, Next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Get token and user identifier
  const token = req.cookies.get('pentaart_token')?.value
  const userId = req.cookies.get('pentaart_user_id')?.value || req.ip || 'anonymous'
  
  // Rate limiting check
  if (!checkRateLimit(userId, pathname)) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'Please slow down and try again later',
        retryAfter: 60,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
        },
      }
    )
  }

  // Get user agent and geolocation
  const userAgent = req.headers.get('user-agent') || ''
  const device = detectDevice(userAgent)
  const geo = getGeolocation(req)

  // Validate session if token exists
  let sessionData: { valid: boolean; userData?: any } = { valid: false }
  if (token) {
    sessionData = await validateSession(token)
  }

  // Check protected routes
  for (const path of ROUTE_CONFIG.protected.paths) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      if (!token || !sessionData.valid) {
        const loginUrl = new URL(ROUTE_CONFIG.protected.redirectTo, req.url)
        loginUrl.searchParams.set('next', pathname)
        loginUrl.searchParams.set('reason', 'auth_required')
        
        // Log analytics
        await logAnalytics({
          type: 'auth_redirect',
          path: pathname,
          metadata: { device, geo },
        })
        
        return NextResponse.redirect(loginUrl)
      }
      break
    }
  }

  // Check guest-only routes
  for (const path of ROUTE_CONFIG.guestOnly.paths) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      if (token && sessionData.valid) {
        return NextResponse.redirect(new URL(ROUTE_CONFIG.guestOnly.redirectTo, req.url))
      }
      break
    }
  }

  // Check admin routes
  for (const path of ROUTE_CONFIG.admin.paths) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      if (!token || !sessionData.valid || sessionData.userData?.role !== 'admin') {
        return NextResponse.redirect(new URL(ROUTE_CONFIG.admin.redirectTo, req.url))
      }
      break
    }
  }

  // Check premium routes
  for (const path of ROUTE_CONFIG.premium.paths) {
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      if (!token || !sessionData.valid || sessionData.userData?.plan !== 'premium') {
        const pricingUrl = new URL(ROUTE_CONFIG.premium.redirectTo, req.url)
        pricingUrl.searchParams.set('upgrade', 'required')
        pricingUrl.searchParams.set('feature', pathname)
        return NextResponse.redirect(pricingUrl)
      }
      break
    }
  }

  // Create response
  const response = NextResponse.next()

  // Add security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Add custom headers for client-side use
  response.headers.set('X-Device-Type', device)
  response.headers.set('X-User-Country', geo.country)
  response.headers.set('X-Response-Time', `${Date.now() - startTime}ms`)

  // A/B Testing (if user is logged in)
  if (sessionData.valid && sessionData.userData?.id) {
    const variant = getABTestVariant(sessionData.userData.id, 'new_studio_ui')
    response.cookies.set('ab_test_studio_ui', variant, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: false,
      sameSite: 'lax',
    })
  }

  // Set user metadata cookies for client-side access (if logged in)
  if (sessionData.valid && sessionData.userData) {
    response.cookies.set('user_plan', sessionData.userData.plan || 'free', {
      maxAge: 24 * 60 * 60, // 1 day
      httpOnly: false,
      sameSite: 'lax',
    })
  }

  // Log page view analytics
  await logAnalytics({
    type: 'page_view',
    path: pathname,
    userId: sessionData.userData?.id,
    metadata: {
      device,
      geo,
      referrer: req.headers.get('referer'),
      userAgent: userAgent.slice(0, 100), // Truncate for storage
    },
  })

  return response
}

// Middleware configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - API routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}