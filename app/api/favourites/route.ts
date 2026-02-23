import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/favourites — list product IDs (or full products) favourited by current user
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const list = await prisma.productFavourite.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          business: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return json({
    data: list.map((f) => ({ productId: f.productId, product: f.product, createdAt: f.createdAt })),
    productIds: list.map((f) => f.productId),
  });
}

// POST /api/favourites — add to favourites (body: { productId })
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const body = await req.json();
  const productId = body.productId;
  if (!productId) return error('productId required');

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return error('Product not found', 404);

  await prisma.productFavourite.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId },
    update: {},
  });

  return json({ success: true, productId }, 201);
}
