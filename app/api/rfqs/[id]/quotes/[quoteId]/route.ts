import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// PUT /api/rfqs/:id/quotes/:quoteId — accept/reject
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; quoteId: string }> }) {
  const { id: rfqId, quoteId } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  // Only RFQ buyer can update quote status
  const rfq = await prisma.rFQ.findUnique({ where: { id: rfqId } });
  if (!rfq || rfq.buyerId !== userId) return error('Forbidden', 403);

  const { status } = await req.json();
  if (!['accepted', 'rejected'].includes(status)) return error('Invalid status');

  const quote = await prisma.quote.update({
    where: { id: quoteId },
    data: { status },
    include: { business: { select: { id: true, name: true, category: true, city: true } } },
  });

  // Close RFQ if quote accepted
  if (status === 'accepted') {
    await prisma.rFQ.update({ where: { id: rfqId }, data: { status: 'closed' } });
  }

  return json(quote);
}
