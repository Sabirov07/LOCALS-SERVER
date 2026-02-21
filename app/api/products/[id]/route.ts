import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/products/:id
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      business: { select: { id: true, userId: true, name: true, category: true, city: true, createdAt: true, updatedAt: true } },
      businessCategory: true,
    },
  });
  if (!product) return error('Product not found', 404);
  return json(product);
}

// PUT /api/products/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const product = await prisma.product.findUnique({ where: { id }, include: { business: true } });
  if (!product) return error('Product not found', 404);
  if (product.business.userId !== userId) return error('Forbidden', 403);

  const body = await req.json();
  const allowed = ['categoryId', 'name', 'description', 'price', 'category', 'imageUrls', 'isAvailable', 'moq', 'unit', 'leadTime'];
  const data: any = { updatedAt: new Date() };
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const updated = await prisma.product.update({
    where: { id },
    data,
    include: { business: { select: { id: true, userId: true, name: true, category: true, city: true, createdAt: true, updatedAt: true } }, businessCategory: true },
  });

  return json(updated);
}

// DELETE /api/products/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const product = await prisma.product.findUnique({ where: { id }, include: { business: true } });
  if (!product) return error('Product not found', 404);
  if (product.business.userId !== userId) return error('Forbidden', 403);

  await prisma.product.delete({ where: { id } });
  return json({ success: true });
}
