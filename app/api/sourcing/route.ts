import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error } from '@/lib/api-utils';
import { getAuthUser } from '@/lib/supabase';

// GET /api/sourcing
export async function GET(req: NextRequest) {
  const city = new URL(req.url).searchParams.get('city');

  // Note: sourcing uses rfqs table in current schema
  const rfqs = await prisma.rFQ.findMany({
    where: { status: 'open' },
    include: { buyer: { select: { id: true, username: true, fullName: true, email: true, role: true, city: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return json(rfqs);
}

// POST /api/sourcing
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req.headers.get('authorization'));
    if (!authUser) return error('Unauthorized', 401);

    const userId = authUser.id;

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return error('Invalid JSON body');
    }

    const { title, description, category, quantity, unit, budget } = body as {
      title?: string;
      description?: string;
      category?: string;
      quantity?: number;
      unit?: string;
      budget?: string;
    };

    if (!title || typeof title !== 'string' || !title.trim()) return error('title is required');
    if (!description || typeof description !== 'string' || !description.trim()) return error('description is required');
    if (!category || typeof category !== 'string' || !category.trim()) return error('category is required');

    // Ensure user exists in DB (e.g. if they signed up via Auth but profile was not synced)
    const email = authUser.email?.trim() || `${userId}@locals.app`;
    const rawUsername = authUser.user_metadata?.username ?? authUser.email?.split('@')[0];
    const preferredUsername = (typeof rawUsername === 'string' ? rawUsername : '').trim() || null;
    const uniqueUsername = preferredUsername || `user_${userId.replace(/-/g, '')}`;
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email,
        username: uniqueUsername,
        role: 'individual',
      },
      update: {},
    });

    const rfq = await prisma.rFQ.create({
      data: {
        buyerId: userId,
        title: String(title).trim(),
        description: String(description).trim(),
        industry: String(category).trim(),
        quantity: typeof quantity === 'number' && Number.isInteger(quantity) ? quantity : Number.parseInt(String(quantity), 10) || 0,
        unit: typeof unit === 'string' && unit ? unit : 'pieces',
        budget: typeof budget === 'string' && budget.trim() ? budget.trim() : null,
      },
      include: { buyer: { select: { id: true, username: true, fullName: true, email: true, role: true, city: true } } },
    });

    return json(rfq, 201);
  } catch (e: any) {
    console.error('POST /api/sourcing error:', e);
    return error(e?.message || 'Failed to create sourcing request', 500);
  }
}
