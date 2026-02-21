import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/rfqs
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const industry = searchParams.get('industry');
  const status = searchParams.get('status');
  const buyerId = searchParams.get('buyerId');

  const where: any = {};
  if (industry && industry !== 'all') where.industry = industry;
  if (status) where.status = status;
  if (buyerId) where.buyerId = buyerId;

  const rfqs = await prisma.rFQ.findMany({
    where,
    include: {
      buyer: { select: { id: true, username: true, fullName: true, avatarUrl: true, email: true, role: true, city: true } },
      _count: { select: { quotes: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return json(rfqs.map((r) => ({ ...r, quotesCount: r._count.quotes, _count: undefined })));
}

// POST /api/rfqs
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { title, description, industry, quantity, unit, budget, deadline, specifications } = await req.json();
  if (!title || !description || !industry || !quantity) return error('title, description, industry, quantity required');

  const rfq = await prisma.rFQ.create({
    data: {
      buyerId: userId,
      title, description, industry,
      quantity: parseInt(quantity),
      unit: unit || 'pieces',
      budget: budget || null,
      deadline: deadline ? new Date(deadline) : null,
      specifications: specifications || {},
    },
    include: { buyer: { select: { id: true, username: true, fullName: true, email: true, role: true, city: true } } },
  });

  return json({ ...rfq, quotesCount: 0 }, 201);
}
