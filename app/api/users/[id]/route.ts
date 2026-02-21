import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error } from '@/lib/api-utils';

// GET /api/users/:id — public user profile
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, fullName: true, avatarUrl: true, role: true, city: true, district: true, createdAt: true },
  });
  if (!user) return error('User not found', 404);
  return json(user);
}
