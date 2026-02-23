import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// POST /api/products/:id/inquiry — create a quote or order request (body: { type: "quote" | "order", quantity?: number, message?: string })
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { id: productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return error('Product not found', 404);

  const body = await req.json();
  const type = body.type === 'order' ? 'order' : 'quote';
  const quantity = Math.max(1, parseInt(body.quantity, 10) || 1);
  const message = typeof body.message === 'string' ? body.message.trim() || null : null;

  const inquiry = await prisma.productInquiry.create({
    data: { userId, productId, type, quantity, message },
    include: {
      product: { select: { id: true, name: true, price: true } },
    },
  });

  return json(inquiry, 201);
}
