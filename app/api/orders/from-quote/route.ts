import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// POST /api/orders/from-quote — create a single order from a quote (e.g. from chat)
// Body: { productId: string, quantity: number, unitPrice: number }
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const body = await req.json().catch(() => ({}));
  const productId = body.productId;
  const quantity = Math.max(1, parseInt(body.quantity, 10) || 1);
  const unitPrice = Number(body.unitPrice);
  if (!productId || typeof productId !== 'string') return error('productId required', 400);
  if (Number.isNaN(unitPrice) || unitPrice < 0) return error('Valid unitPrice required', 400);

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { business: { select: { id: true, userId: true, name: true } } },
  });
  if (!product) return error('Product not found', 404);

  const businessId = product.business.id;
  const sellerId = product.business.userId;
  const totalAmount = unitPrice * quantity;

  const order = await prisma.order.create({
    data: {
      buyerId: userId,
      sellerId,
      businessId,
      totalAmount,
      status: 'pending',
      note: 'Order from quote',
      items: {
        create: {
          productId,
          quantity,
          unitPrice,
          totalPrice: totalAmount,
        },
      },
    },
    include: {
      items: { include: { product: { select: { id: true, name: true, imageUrls: true, price: true } } } },
      business: { select: { id: true, name: true } },
    },
  });

  return json({ data: order }, 201);
}
