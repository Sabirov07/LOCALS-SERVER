import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

const ALLOWED_STATUSES = ['pending', 'confirmed', 'rejected'];

/**
 * PATCH /api/seller/inquiries/:id
 * Update inquiry status (confirm or reject). For quote type, optional responsePrice and responseMessage.
 * Body: { status: "confirmed" | "rejected", responsePrice?: number, responseMessage?: string }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = typeof body.status === 'string' ? body.status.toLowerCase().trim() : '';

  if (!ALLOWED_STATUSES.includes(status)) {
    return error('status must be one of: pending, confirmed, rejected');
  }

  const inquiry = await prisma.productInquiry.findUnique({
    where: { id },
    include: { product: { include: { business: true } } },
  });

  if (!inquiry) return error('Inquiry not found', 404);
  if (inquiry.product.business.userId !== userId) return error('Forbidden', 403);

  const data: { status: string; responsePrice?: number; responseMessage?: string | null; respondedAt?: Date } = {
    status,
  };
  if (status === 'confirmed') {
    data.respondedAt = new Date();
    if (body.responsePrice != null && body.responsePrice !== '') {
      const price = Number(body.responsePrice);
      if (!Number.isNaN(price) && price >= 0) data.responsePrice = price;
    }
    if (typeof body.responseMessage === 'string') data.responseMessage = body.responseMessage.trim() || null;
  }

  const updated = await prisma.productInquiry.update({
    where: { id },
    data,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          category: true,
          imageUrls: true,
          unit: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  return json({
    id: updated.id,
    type: updated.type,
    quantity: updated.quantity,
    message: updated.message,
    status: updated.status,
    responsePrice: updated.responsePrice != null ? Number(updated.responsePrice) : null,
    responseMessage: updated.responseMessage,
    respondedAt: updated.respondedAt,
    createdAt: updated.createdAt,
    product: updated.product,
    buyer: updated.user,
  });
}
