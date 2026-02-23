import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// DELETE /api/favourites/:productId — remove from favourites
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { productId } = await params;

  await prisma.productFavourite.deleteMany({
    where: { userId, productId },
  });

  return json({ success: true });
}
