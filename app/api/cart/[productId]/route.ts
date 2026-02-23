import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// DELETE /api/cart/:productId — remove item from cart
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { productId } = await params;

  await prisma.cartItem.deleteMany({
    where: { userId, productId },
  });

  return json({ success: true });
}

// PUT /api/cart/:productId — set quantity (body: { quantity })
export async function PUT(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { productId } = await params;
  const body = await req.json();
  const quantity = Math.max(0, parseInt(body.quantity, 10) ?? 1);

  if (quantity === 0) {
    await prisma.cartItem.deleteMany({ where: { userId, productId } });
    return json({ success: true, quantity: 0 });
  }

  const item = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!item) return error('Cart item not found', 404);

  const updated = await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity, updatedAt: new Date() },
    include: { product: { include: { business: { select: { id: true, name: true } } } } },
  });
  return json(updated);
}
