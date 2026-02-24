import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const DEFAULT_ALLOW_ORIGIN = 'http://localhost:8081';

const ALLOWED_ORIGINS: (string | RegExp)[] = [
  DEFAULT_ALLOW_ORIGIN,
  'http://localhost:19006',
  'http://127.0.0.1:8081',
  'http://127.0.0.1:19006',
  // Expo web can run on other ports
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.some((o) => (typeof o === 'string' ? o === origin : o.test(origin)))) return true;
  // Allow same-host (e.g. LAN IP when opening app at http://192.168.0.105:8081)
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return true;
    // Optional: allow LAN IP origins in dev (same machine or local network)
    if (process.env.NODE_ENV !== 'production' && /^192\.168\.\d+\.\d+$/.test(u.hostname)) return true;
  } catch {
    return false;
  }
  return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin: string = origin && isOriginAllowed(origin) ? origin : DEFAULT_ALLOW_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('Origin');
  const headers = corsHeaders(origin);

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
