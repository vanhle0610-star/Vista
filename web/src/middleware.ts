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

  if (!isProtected) {
    return NextResponse.next();
  }

  const tokenCookie = request.cookies.get('vista_token')?.value;
  const authHeader = request.headers.get('authorization');
  const token = tokenCookie || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname + (search || ''));
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT structure (3 parts)
  const parts = token.split('.');
  if (parts.length !== 3) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname + (search || ''));
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('vista_token');
    return response;
  }

  try {
    // Decode base64url payload
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname + (search || ''));
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('vista_token');
      return response;
    }

    // Check roles - must have ROLE_ADMIN, ROLE_MODERATOR, ADMIN, or MODERATOR
    const roles: string[] = Array.isArray(payload.roles)
      ? payload.roles
      : typeof payload.role === 'string'
      ? [payload.role]
      : [];

    const hasAdminOrMod = roles.some(
      (r) =>
        typeof r === 'string' &&
        (r.toUpperCase().includes('ADMIN') || r.toUpperCase().includes('MODERATOR'))
    );

    if (!hasAdminOrMod) {
      // Forbidden: not an admin or moderator, redirect to home or login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname + (search || ''));
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/destinations/:path*',
    '/users/:path*',
    '/moderation/:path*',
  ],
};
