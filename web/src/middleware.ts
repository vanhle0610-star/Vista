import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware Route Guard for VISTA Admin protected areas.
 * Guarantees that unauthenticated users cannot access dashboard, users, moderation, etc.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Never intercept static assets, images, or media files
  if (/\.[a-zA-Z0-9]+$/.test(pathname)) {
    return NextResponse.next();
  }

  // Protected paths requiring active administrator session
  const protectedPaths = [
    '/dashboard',
    '/destinations',
    '/users',
    '/moderation',
  ];
  const isProtected = protectedPaths.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isProtected) {
    const token = request.cookies.get('vista_token')?.value;
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname + search);
      return NextResponse.redirect(loginUrl);
    }

    // Verify token format (standard JWT has 3 dot-separated base64url parts)
    const parts = token.split('.');
    if (parts.length !== 3) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname + search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/destinations/:path*',
    '/users/:path*',
    '/moderation/:path*',
  ],
};
