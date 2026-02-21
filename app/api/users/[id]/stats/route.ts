import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json } from '@/lib/api-utils';

// GET /api/users/:id/stats
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [followingCount, business] = await Promise.all([
    prisma.follow.count({ where: { followerId: id } }),
    prisma.business.findUnique({ where: { userId: id }, select: { id: true } }),
  ]);

  let followerCount = 0;
  let productCount = 0;
  if (business) {
    [followerCount, productCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: business.id } }),
      prisma.product.count({ where: { businessId: business.id } }),
    ]);
  }

  return json({ followingCount, followerCount, productCount, hasBusinesss: !!business });
}
