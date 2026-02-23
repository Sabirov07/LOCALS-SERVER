import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/cart — list current user's cart items with product details
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          business: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return json({ data: items });
}

// POST /api/cart — add or update quantity (body: { productId, quantity?: })
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const body = await req.json();
  const productId = body.productId;
  const quantity = Math.max(1, parseInt(body.quantity, 10) || 1);

  if (!productId) return error('productId required');

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return error('Product not found', 404);

  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });

  if (existing) {
    const updated = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity, updatedAt: new Date() },
      include: { product: { include: { business: { select: { id: true, name: true } } } } },
    });
    return json(updated, 200);
  }

  const created = await prisma.cartItem.create({
    data: { userId, productId, quantity },
    include: { product: { include: { business: { select: { id: true, name: true } } } } },
  });
  return json(created, 201);
}
