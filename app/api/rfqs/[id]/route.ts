import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/rfqs/:id
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rfq = await prisma.rFQ.findUnique({
    where: { id },
    include: {
      buyer: { select: { id: true, username: true, fullName: true, email: true, role: true, city: true } },
      _count: { select: { quotes: true } },
    },
  });
  if (!rfq) return error('RFQ not found', 404);
  return json({ ...rfq, quotesCount: rfq._count.quotes });
}

// PUT /api/rfqs/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const rfq = await prisma.rFQ.findUnique({ where: { id } });
  if (!rfq) return error('RFQ not found', 404);
  if (rfq.buyerId !== userId) return error('Forbidden', 403);

  const body = await req.json();
  const updated = await prisma.rFQ.update({
    where: { id },
    data: {
      ...(body.status && { status: body.status }),
      updatedAt: new Date(),
    },
  });
  return json(updated);
}

// DELETE /api/rfqs/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const rfq = await prisma.rFQ.findUnique({ where: { id } });
  if (!rfq) return error('RFQ not found', 404);
  if (rfq.buyerId !== userId) return error('Forbidden', 403);

  await prisma.rFQ.delete({ where: { id } });
  return json({ success: true });
}
