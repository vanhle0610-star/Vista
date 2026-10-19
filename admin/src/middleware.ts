import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware Route Guard for VISTA Admin protected areas.
 * Guarantees that unauthenticated users cannot access dashboard, users, moderation, etc.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Protected paths requiring active administrator session
  const protectedPaths = ['/dashboard', '/destinations', '/users', '/moderation'];
  const isProtected = protectedPaths.some((prefix) => pathname.startsWith(prefix));

  if (isProtected) {
    const token =
      request.cookies.get('vista_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      const returnUrl = encodeURIComponent(`${pathname}${search}`);
      const loginUrl = new URL(`/login?returnUrl=${returnUrl}`, request.url);
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
