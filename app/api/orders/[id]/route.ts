import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/orders/:id
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, imageUrls: true, price: true, unit: true },
          },
        },
      },
      business: { select: { id: true, name: true, avatarUrl: true, city: true } },
      buyer: { select: { id: true, fullName: true, username: true, email: true, avatarUrl: true } },
      seller: { select: { id: true, fullName: true, username: true, email: true } },
    },
  });

  if (!order) return error('Order not found', 404);
  if (order.buyerId !== userId && order.sellerId !== userId) {
    return error('Forbidden', 403);
  }

  return json({ data: order });
}

const orderInclude = {
  items: {
    include: {
      product: {
        select: { id: true, name: true, imageUrls: true, price: true, unit: true },
      },
    },
  },
  business: { select: { id: true, name: true, avatarUrl: true, city: true } },
  buyer: { select: { id: true, fullName: true, username: true, email: true, avatarUrl: true } },
  seller: { select: { id: true, fullName: true, username: true, email: true } },
} as const;

// PATCH /api/orders/:id — buyer can update note and items when order is pending
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return error('Order not found', 404);
  if (order.buyerId !== userId) return error('Forbidden', 403);
  if (order.status !== 'pending') return error('Can only edit pending orders', 400);

  const body = await req.json();
  const note = typeof body.note === 'string' ? body.note : undefined;
  const itemsPayload = Array.isArray(body.items)
    ? body.items.filter(
        (x: unknown) =>
          x != null &&
          typeof x === 'object' &&
          typeof (x as { id?: unknown }).id === 'string' &&
          typeof (x as { quantity?: unknown }).quantity === 'number'
      ) as { id: string; quantity: number }[]
    : undefined;

  if (itemsPayload !== undefined) {
    const orderItemIds = new Set(order.items.map((i) => i.id));
    for (const { id: itemId, quantity } of itemsPayload) {
      if (!orderItemIds.has(itemId)) return error(`Order item not found: ${itemId}`, 400);
      if (quantity < 0) return error('Quantity must be non-negative', 400);
    }

    // Update quantities for items with quantity > 0
    for (const { id: itemId, quantity } of itemsPayload) {
      if (quantity === 0) continue;
      const item = order.items.find((i) => i.id === itemId);
      if (!item) continue;
      const totalPrice = item.unitPrice * quantity;
      await prisma.orderItem.update({
        where: { id: itemId },
        data: { quantity, totalPrice },
      });
    }

    // Delete items that are removed (qty 0 in payload) or not in payload
    const keptIds = new Set(itemsPayload.filter((x) => x.quantity > 0).map((x) => x.id));
    for (const item of order.items) {
      if (!keptIds.has(item.id)) {
        await prisma.orderItem.delete({ where: { id: item.id } });
      }
    }

    // Recalculate order total
    const remaining = await prisma.orderItem.findMany({
      where: { orderId: id },
      select: { totalPrice: true },
    });
    const totalAmount = remaining.reduce((sum, i) => sum + i.totalPrice, 0);
    await prisma.order.update({
      where: { id },
      data: { totalAmount, ...(note !== undefined && { note }) },
    });
  } else if (note !== undefined) {
    await prisma.order.update({
      where: { id },
      data: { note },
    });
  }

  const updated = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });
  if (!updated) return error('Order not found', 404);
  return json({ data: updated });
}
