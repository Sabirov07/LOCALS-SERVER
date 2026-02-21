import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from './supabase';

export function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Extract and verify the authenticated user ID from the request.
 * Returns null if not authenticated.
 */
export async function getAuthUserId(req: NextRequest): Promise<string | null> {
  return verifyAuth(req.headers.get('authorization'));
}

/**
 * Require authentication — returns user ID or throws a 401 response.
 */
export async function requireAuth(req: NextRequest): Promise<string> {
  const userId = await getAuthUserId(req);
  if (!userId) throw error('Unauthorized', 401);
  return userId;
}

/**
 * Wrapper for route handlers with auth + error handling.
 */
export function withAuth(handler: (req: NextRequest, userId: string, ctx?: any) => Promise<NextResponse>) {
  return async (req: NextRequest, ctx?: any) => {
    try {
      const userId = await getAuthUserId(req);
      if (!userId) return error('Unauthorized', 401);
      return await handler(req, userId, ctx);
    } catch (err: any) {
      if (err instanceof NextResponse) return err;
      console.error('API Error:', err);
      return error(err?.message || 'Internal Server Error', 500);
    }
  };
}
