import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/sourcing
export async function GET(req: NextRequest) {
  const city = new URL(req.url).searchParams.get('city');

  // Note: sourcing uses rfqs table in current schema
  const rfqs = await prisma.rFQ.findMany({
    where: { status: 'open' },
    include: { buyer: { select: { id: true, username: true, fullName: true, email: true, role: true, city: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return json(rfqs);
}

// POST /api/sourcing
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { title, description, category, quantity, unit, budget, city } = await req.json();
  if (!title || !description || !category) return error('title, description, category required');

  const rfq = await prisma.rFQ.create({
    data: {
      buyerId: userId,
      title, description,
      industry: category,
      quantity: quantity || 0,
      unit: unit || 'pieces',
      budget: budget || null,
    },
    include: { buyer: { select: { id: true, username: true, fullName: true, email: true, role: true, city: true } } },
  });

  return json(rfq, 201);
}
