import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';
import { getAuthUser } from '@/lib/supabase';

// GET /api/businesses — list/search businesses
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const userId = searchParams.get('userId');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: any = {};
  if (city) where.city = { contains: city, mode: 'insensitive' };
  if (category && category !== 'all') where.category = category;
  if (userId) where.userId = userId;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [businesses, total] = await Promise.all([
    prisma.business.findMany({
      where,
      include: {
        _count: { select: { products: true, follows: true } },
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.business.count({ where }),
  ]);

  const data = businesses.map((b) => ({
    ...b,
    followerCount: b._count.follows,
    productCount: b._count.products,
    _count: undefined,
  }));

  return json({ data, total, limit, offset });
}

// POST /api/businesses — create business
export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req.headers.get('authorization'));
  if (!authUser) return error('Unauthorized', 401);
  const userId = authUser.id;

  // Ensure user exists in DB (app may use Supabase Auth only; server needs users row for FK)
  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: authUser.email,
      username: authUser.email?.split('@')[0] ?? null,
      role: 'individual',
    },
    update: {},
  });

  // Check existing
  const existing = await prisma.business.findUnique({ where: { userId } });
  if (existing) return error('You already have a business profile', 409);

  const body = await req.json();
  const { name, category, description, city, district, companyType, industry } = body;

  if (!name || !category || !city) return error('name, category, city required');

  const business = await prisma.business.create({
    data: { userId, name, category, description, city, district, companyType, industry },
    include: { _count: { select: { products: true, follows: true } } },
  });

  return json({ ...business, followerCount: 0, productCount: 0 }, 201);
}
