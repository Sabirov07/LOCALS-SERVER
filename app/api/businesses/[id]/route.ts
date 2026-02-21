import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/businesses/:id
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const business = await prisma.business.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, fullName: true, avatarUrl: true, email: true } },
      _count: { select: { products: true, follows: true } },
    },
  });

  if (!business) return error('Business not found', 404);

  return json({ ...business, followerCount: business._count.follows, productCount: business._count.products });
}

// PUT /api/businesses/:id
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const existing = await prisma.business.findUnique({ where: { id } });
  if (!existing) return error('Business not found', 404);
  if (existing.userId !== userId) return error('Forbidden', 403);

  const body = await req.json();
  const allowed = ['name', 'category', 'description', 'city', 'district', 'avatarUrl', 'coverImageUrl', 'companyType', 'industry', 'tags'];
  const data: any = { updatedAt: new Date() };
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key];
  }

  const business = await prisma.business.update({
    where: { id },
    data,
    include: { _count: { select: { products: true, follows: true } } },
  });

  return json({ ...business, followerCount: business._count.follows, productCount: business._count.products });
}

// DELETE /api/businesses/:id
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const existing = await prisma.business.findUnique({ where: { id } });
  if (!existing) return error('Business not found', 404);
  if (existing.userId !== userId) return error('Forbidden', 403);

  await prisma.business.delete({ where: { id } });
  return json({ success: true });
}
