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

// PATCH /api/orders/:id — buyer can update note when order is pending
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return error('Order not found', 404);
  if (order.buyerId !== userId) return error('Forbidden', 403);
  if (order.status !== 'pending') return error('Can only edit pending orders', 400);

  const body = await req.json();
  const note = typeof body.note === 'string' ? body.note : undefined;

  const updated = await prisma.order.update({
    where: { id },
    data: { note: note ?? order.note },
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

  return json({ data: updated });
}
