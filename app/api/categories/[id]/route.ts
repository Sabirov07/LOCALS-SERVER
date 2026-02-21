import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// PUT /api/categories/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const cat = await prisma.category.findUnique({ where: { id }, include: { business: true } });
  if (!cat) return error('Category not found', 404);
  if (cat.business.userId !== userId) return error('Forbidden', 403);

  const { name, description, icon, sortOrder } = await req.json();
  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(icon !== undefined && { icon }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
    include: { _count: { select: { products: true } } },
  });

  return json({ ...updated, productCount: updated._count.products });
}

// DELETE /api/categories/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const cat = await prisma.category.findUnique({ where: { id }, include: { business: true } });
  if (!cat) return error('Category not found', 404);
  if (cat.business.userId !== userId) return error('Forbidden', 403);

  await prisma.category.delete({ where: { id } });
  return json({ success: true });
}
