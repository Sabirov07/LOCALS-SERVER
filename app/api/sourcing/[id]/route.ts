import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// DELETE /api/sourcing/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const rfq = await prisma.rFQ.findUnique({ where: { id } });
  if (!rfq) return error('Not found', 404);
  if (rfq.buyerId !== userId) return error('Forbidden', 403);

  await prisma.rFQ.delete({ where: { id } });
  return json({ success: true });
}
