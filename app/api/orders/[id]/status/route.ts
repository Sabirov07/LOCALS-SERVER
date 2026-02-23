import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
};

// PUT /api/orders/:id/status
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;

  const body = await req.json();
  const { status, responseNote } = body;
  if (!status) return error('status is required', 400);

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return error('Order not found', 404);

  // Buyer can only cancel
  if (userId === order.buyerId) {
    if (status !== 'cancelled') return error('Buyers can only cancel orders', 403);
    if (order.status !== 'pending') return error('Can only cancel pending orders', 400);
  } else if (userId === order.sellerId) {
    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
      return error(`Cannot transition from ${order.status} to ${status}`, 400);
    }
    if (status === 'cancelled') return error('Sellers cannot cancel, use rejected', 400);
  } else {
    return error('Forbidden', 403);
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status,
      responseNote: responseNote || order.responseNote,
    },
    include: {
      items: { include: { product: { select: { id: true, name: true, imageUrls: true } } } },
      business: { select: { id: true, name: true } },
    },
  });

  return json({ data: updated });
}
