import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/rfqs/:id/quotes
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quotes = await prisma.quote.findMany({
    where: { rfqId: id },
    include: { business: { select: { id: true, userId: true, name: true, category: true, city: true, companyType: true, industry: true, certifications: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return json(quotes);
}

// POST /api/rfqs/:id/quotes — submit quote
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: rfqId } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { businessId, unitPrice, totalPrice, moq, leadTime, notes, validUntil } = await req.json();
  if (!businessId || !unitPrice || !totalPrice || !leadTime || !validUntil) {
    return error('businessId, unitPrice, totalPrice, leadTime, validUntil required');
  }

  // Verify business ownership
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || business.userId !== userId) return error('Forbidden', 403);

  const quote = await prisma.quote.create({
    data: {
      rfqId, supplierId: userId, businessId,
      unitPrice, totalPrice, moq: moq || 1, leadTime,
      notes: notes || null, validUntil: new Date(validUntil),
    },
    include: { business: { select: { id: true, userId: true, name: true, category: true, city: true, companyType: true, industry: true } } },
  });

  // Update RFQ status
  await prisma.rFQ.update({ where: { id: rfqId, status: 'open' }, data: { status: 'quoted' } }).catch(() => {});

  return json(quote, 201);
}
