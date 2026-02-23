import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// POST /api/orders — create orders from cart (one per business)
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const body = await req.json().catch(() => ({}));
  const note = body.note || null;

  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      product: {
        include: { business: { select: { id: true, userId: true, name: true } } },
      },
    },
  });

  if (cartItems.length === 0) return error('Cart is empty', 400);

  // Group by business
  const grouped: Record<string, typeof cartItems> = {};
  for (const item of cartItems) {
    const bizId = item.product.business.id;
    if (!grouped[bizId]) grouped[bizId] = [];
    grouped[bizId].push(item);
  }

  const createdOrders: any[] = [];

  for (const [businessId, items] of Object.entries(grouped)) {
    const biz = items[0].product.business;
    const totalAmount = items.reduce(
      (sum, i) => sum + Number(i.product.price) * i.quantity,
      0,
    );

    const order = await prisma.order.create({
      data: {
        buyerId: userId,
        sellerId: biz.userId,
        businessId,
        totalAmount,
        note,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: Number(i.product.price),
            totalPrice: Number(i.product.price) * i.quantity,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, imageUrls: true } } } },
        business: { select: { id: true, name: true } },
      },
    });
    createdOrders.push(order);
  }

  // Clear cart
  await prisma.cartItem.deleteMany({ where: { userId } });

  return json({ data: createdOrders }, 201);
}

// GET /api/orders — buyer's orders
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');

  const where: any = { buyerId: userId };
  if (status && status !== 'all') where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: {
          product: { select: { id: true, name: true, imageUrls: true, price: true } },
        },
      },
      business: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return json({ data: orders });
}
