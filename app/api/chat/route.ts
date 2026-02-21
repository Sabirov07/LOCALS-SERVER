import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/chat — list conversations for current user
export async function GET(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ participant1Id: userId }, { participant2Id: userId }] },
    include: {
      participant1: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
      participant2: { select: { id: true, username: true, fullName: true, avatarUrl: true } },
      messages: { take: 1, orderBy: { createdAt: 'desc' } },
    },
    orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
  });

  // Get unread counts
  const result = await Promise.all(conversations.map(async (conv) => {
    const unreadCount = await prisma.message.count({
      where: { conversationId: conv.id, senderId: { not: userId }, isRead: false },
    });
    return {
      ...conv,
      lastMessage: conv.messages[0] || null,
      messages: undefined,
      unreadCount,
    };
  }));

  return json(result);
}

// POST /api/chat — get or create conversation
export async function POST(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { otherUserId } = await req.json();
  if (!otherUserId) return error('otherUserId required');

  // Check existing (both directions)
  let conv = await prisma.conversation.findFirst({
    where: {
      OR: [
        { participant1Id: userId, participant2Id: otherUserId },
        { participant1Id: otherUserId, participant2Id: userId },
      ],
    },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: { participant1Id: userId, participant2Id: otherUserId },
    });
  }

  return json(conv);
}
