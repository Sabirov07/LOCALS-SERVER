import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/categories?businessId=xxx
export async function GET(req: NextRequest) {
  const businessId = new URL(req.url).searchParams.get('businessId');
  if (!businessId) return error('businessId required');

  const categories = await prisma.category.findMany({
    where: { businessId },
    include: { _count: { select: { products: true } } },
    orderBy: { sortOrder: 'asc' },
  });

  return json(categories.map((c) => ({ ...c, productCount: c._count.products, _count: undefined })));
}

// POST /api/categories
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { businessId, name, description, icon, sortOrder } = await req.json();
  if (!businessId || !name) return error('businessId, name required');

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || business.userId !== userId) return error('Forbidden', 403);

  // Auto sort order
  let order = sortOrder;
  if (order === undefined) {
    const max = await prisma.category.findFirst({ where: { businessId }, orderBy: { sortOrder: 'desc' } });
    order = (max?.sortOrder ?? -1) + 1;
  }

  const category = await prisma.category.create({
    data: { businessId, name, description, icon, sortOrder: order },
  });

  return json({ ...category, productCount: 0 }, 201);
}
