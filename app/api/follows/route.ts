import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/follows?businessId=xxx — check if user follows
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const businessId = new URL(req.url).searchParams.get('businessId');
  if (!businessId) return error('businessId required');

  const follow = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: userId, followingId: businessId } },
  });

  return json({ following: !!follow });
}

// POST /api/follows — toggle follow
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { businessId } = await req.json();
  if (!businessId) return error('businessId required');

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: userId, followingId: businessId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return json({ following: false });
  } else {
    await prisma.follow.create({ data: { followerId: userId, followingId: businessId } });
    return json({ following: true });
  }
}
