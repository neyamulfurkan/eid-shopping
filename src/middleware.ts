// src/middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Edge-compatible middleware that protects all /admin routes.
 * Redirects unauthenticated users or non-ADMIN roles to /auth/signin
 * with the original path preserved as a callbackUrl query parameter.
 */
export default auth((req) => {
  const { nextUrl, auth: session } = req;

  const isAuthenticated = !!session;
  const isAdmin = session?.user?.role === 'ADMIN';

  if (!isAuthenticated || !isAdmin) {
    const signInUrl = new URL('/auth/signin', nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*'],
};