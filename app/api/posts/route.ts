import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/posts?city=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  const where: any = {};
  if (city) where.city = { contains: city, mode: 'insensitive' };

  const posts = await prisma.post.findMany({
    where,
    include: { author: { select: { id: true, username: true, fullName: true, avatarUrl: true, email: true } } },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return json(posts);
}

// POST /api/posts
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { businessId, type, title, content, city, imageUrls } = await req.json();
  if (!type || !title || !content || !city) return error('type, title, content, city required');

  const post = await prisma.post.create({
    data: {
      authorId: userId,
      businessId: businessId || null,
      type, title, content, city,
      imageUrls: imageUrls || [],
    },
    include: { author: { select: { id: true, username: true, fullName: true, avatarUrl: true, email: true } } },
  });

  return json(post, 201);
}
