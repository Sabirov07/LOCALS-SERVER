import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json } from '@/lib/api-utils';

// GET /api/discover — homepage data (businesses, products, posts)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

  const cityFilter = city ? { city: { contains: city, mode: 'insensitive' as const } } : {};

  const [businesses, products, posts] = await Promise.all([
    prisma.business.findMany({
      where: cityFilter,
      include: { _count: { select: { products: true, follows: true } } },
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      include: {
        business: { select: { id: true, name: true, city: true, category: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.post.findMany({
      where: cityFilter,
      include: { author: { select: { id: true, username: true, fullName: true, avatarUrl: true } } },
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return json({
    businesses: businesses.map((b) => ({ ...b, followerCount: b._count.follows, productCount: b._count.products, _count: undefined })),
    products,
    posts,
  });
}
