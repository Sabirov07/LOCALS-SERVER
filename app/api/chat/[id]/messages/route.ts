import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { json, error, getAuthUserId } from '@/lib/api-utils';

// GET /api/chat/:id/messages
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    include: { sender: { select: { id: true, username: true, fullName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });

  // Mark as read
  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: userId }, isRead: false },
    data: { isRead: true },
  });

  return json(messages);
}

// POST /api/chat/:id/messages — send message
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getAuthUserId(req);
  if (!userId) return error('Unauthorized', 401);

  const { content, messageType, imageUrl } = await req.json();
  if (!content) return error('content required');

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: userId,
      content,
      messageType: messageType || 'text',
      imageUrl: imageUrl || null,
    },
    include: { sender: { select: { id: true, username: true, fullName: true, avatarUrl: true } } },
  });

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id },
    data: { lastMessageAt: new Date(), updatedAt: new Date() },
  });

  return json(message, 201);
}
