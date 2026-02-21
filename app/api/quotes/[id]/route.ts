import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// PUT /api/quotes/:id — accept/reject quote (buyer of the RFQ)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const quote = await prisma.quote.findUnique({ where: { id }, include: { rfq: true } });
  if (!quote) return error('Quote not found', 404);
  if (quote.rfq.buyerId !== userId) return error('Forbidden', 403);

  const { status } = await req.json();
  if (!['accepted', 'rejected'].includes(status)) return error('Invalid status');

  const updated = await prisma.quote.update({
    where: { id },
    data: { status },
    include: { business: { select: { id: true, name: true, category: true, city: true } } },
  });

  if (status === 'accepted') {
    await prisma.rFQ.update({ where: { id: quote.rfqId }, data: { status: 'closed' } });
  }

  return json(updated);
}
