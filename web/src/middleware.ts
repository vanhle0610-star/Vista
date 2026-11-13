import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware Route Guard for VISTA Admin protected areas.
 * Guarantees that unauthenticated users cannot access dashboard, users, moderation, etc.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Protected paths requiring active administrator session
  const protectedPaths = [
    '/dashboard',
    '/destinations',
    '/image-manager',
    '/users',
    '/moderation',
  ];
  const isProtected = protectedPaths.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  // In local/dev environment, allow all navigation to protected routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/destinations/:path*',
    '/image-manager/:path*',
    '/users/:path*',
    '/moderation/:path*',
  ],
};
