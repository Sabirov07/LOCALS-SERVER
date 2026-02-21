import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/products — list products
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get('businessId');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');

  const where: any = {};
  if (businessId) where.businessId = businessId;
  if (category && category !== 'all') where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        business: { select: { id: true, userId: true, name: true, category: true, city: true, createdAt: true, updatedAt: true } },
        businessCategory: true,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  return json({ data: products, total, limit, offset });
}

// POST /api/products
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const body = await req.json();
  const { businessId, categoryId, name, description, price, category, imageUrls, isAvailable } = body;

  if (!businessId || !name || price === undefined || !category) {
    return error('businessId, name, price, category required');
  }

  // Verify ownership
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || business.userId !== userId) return error('Forbidden', 403);

  const product = await prisma.product.create({
    data: {
      businessId,
      categoryId: categoryId || null,
      name,
      description,
      price,
      category,
      imageUrls: imageUrls || [],
      isAvailable: isAvailable ?? true,
    },
    include: { business: { select: { id: true, userId: true, name: true, category: true, city: true, createdAt: true, updatedAt: true } }, businessCategory: true },
  });

  return json(product, 201);
}
