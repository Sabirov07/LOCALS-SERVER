import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/seller/orders — orders where user is the seller
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const where: any = { sellerId: userId };
  if (status && status !== 'all') where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, imageUrls: true, price: true } },
        },
      },
      business: { select: { id: true, name: true } },
      buyer: { select: { id: true, fullName: true, username: true, email: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return json({ data: orders });
}
