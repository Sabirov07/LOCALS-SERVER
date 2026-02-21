import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/auth — get current user profile
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return error('User not found', 404);

  return json(user);
}

// PUT /api/auth — update current user profile
export async function PUT(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const body = await req.json();
  const { username, fullName, avatarUrl, city, district } = body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(username !== undefined && { username }),
      ...(fullName !== undefined && { fullName }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(city !== undefined && { city }),
      ...(district !== undefined && { district }),
      updatedAt: new Date(),
    },
  });

  return json(user);
}
