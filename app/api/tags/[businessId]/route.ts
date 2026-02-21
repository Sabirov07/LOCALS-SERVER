import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/tags/:businessId
export async function GET(_req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { tags: true } });
  if (!business) return error('Business not found', 404);
  return json(business.tags);
}

// PUT /api/tags/:businessId
export async function PUT(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || business.userId !== userId) return error('Forbidden', 403);

  const { tags } = await req.json();
  const updated = await prisma.business.update({
    where: { id: businessId },
    data: { tags: tags || [] },
    select: { tags: true },
  });

  return json(updated.tags);
}
