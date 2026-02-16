import { NextRequest, NextResponse } from 'next/server';

type JwtPayload = {
  role?: string;
};

const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
};

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  const path = request.nextUrl.pathname;

  if (!path.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (payload.role !== 'pharmacist') {
    return NextResponse.redirect(new URL('/upload', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
