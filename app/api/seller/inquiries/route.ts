import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

/**
 * GET /api/seller/inquiries
 * List quote/order requests for the current user's business (seller).
 * Query: type=quote|order|all, status=pending|confirmed|rejected|all
 */
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const business = await prisma.business.findUnique({ where: { userId } });
  if (!business) return json({ data: [] });

  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get('type');
  const statusFilter = searchParams.get('status');

  const where: any = { product: { businessId: business.id } };
  if (typeFilter && typeFilter !== 'all') where.type = typeFilter;
  if (statusFilter && statusFilter !== 'all') where.status = statusFilter;

  const inquiries = await prisma.productInquiry.findMany({
    where,
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
    orderBy: { createdAt: 'desc' },
  });

  return json({
    data: inquiries.map((i) => ({
      id: i.id,
      type: i.type,
      quantity: i.quantity,
      message: i.message,
      status: i.status,
      responsePrice: i.responsePrice != null ? Number(i.responsePrice) : null,
      responseMessage: i.responseMessage,
      respondedAt: i.respondedAt,
      createdAt: i.createdAt,
      product: i.product,
      buyer: i.user,
    })),
  });
}
