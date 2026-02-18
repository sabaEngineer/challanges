"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

interface MediaItem {
  url: string;
  type: "image" | "video";
}

export async function getOrCreateConversation(otherUserId: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false as const, error: "Not authenticated" };

  if (user.id === otherUserId) {
    return { success: false as const, error: "Cannot message yourself" };
  }

  // Check if a 1:1 conversation already exists between these two users
  const existing = await db.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: user.id } } },
        { participants: { some: { userId: otherUserId } } },
      ],
      participants: { every: { userId: { in: [user.id, otherUserId] } } },
    },
    select: { id: true },
  });

  if (existing) {
    return { success: true as const, conversationId: existing.id };
  }

  // Verify other user exists
  const otherUser = await db.user.findUnique({
    where: { id: otherUserId },
    select: { id: true },
  });

  if (!otherUser) {
    return { success: false as const, error: "User not found" };
  }

  const conversation = await db.conversation.create({
    data: {
      participants: {
        create: [
          { userId: user.id },
          { userId: otherUserId },
        ],
      },
    },
  });

  return { success: true as const, conversationId: conversation.id };
}

export async function getConversations() {
  const user = await getCurrentUser();
  if (!user) return [];

  const conversations = await db.conversation.findMany({
    where: {
      participants: { some: { userId: user.id } },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          mediaUrls: true,
          senderId: true,
          createdAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return conversations.map((conv) => {
    const otherParticipant = conv.participants.find((p) => p.userId !== user.id);
    const myParticipant = conv.participants.find((p) => p.userId === user.id);
    const lastMessage = conv.messages[0] || null;

    const hasUnread =
      lastMessage &&
      lastMessage.senderId !== user.id &&
      (!myParticipant?.lastReadAt || new Date(lastMessage.createdAt) > new Date(myParticipant.lastReadAt));

    return {
      id: conv.id,
      otherUser: otherParticipant?.user || null,
      lastMessage: lastMessage
        ? {
            content: lastMessage.content,
            mediaUrls: lastMessage.mediaUrls as MediaItem[] | null,
            senderId: lastMessage.senderId,
            createdAt: lastMessage.createdAt,
          }
        : null,
      hasUnread: !!hasUnread,
      updatedAt: conv.updatedAt,
    };
  });
}

export async function getMessages(conversationId: string, limit = 50, before?: string) {
  const user = await getCurrentUser();
  if (!user) return { success: false as const, error: "Not authenticated" };

  // Verify user is a participant
  const participant = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
  });

  if (!participant) {
    return { success: false as const, error: "Not a participant" };
  }

  const messages = await db.message.findMany({
    where: {
      conversationId,
      ...(before && { createdAt: { lt: new Date(before) } }),
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return {
    success: true as const,
    messages: messages.reverse().map((m) => ({
      id: m.id,
      content: m.content,
      mediaUrls: m.mediaUrls as MediaItem[] | null,
      sender: m.sender,
      isOwn: m.senderId === user.id,
      createdAt: m.createdAt,
    })),
  };
}

export async function sendMessage(
  conversationId: string,
  content?: string,
  mediaUrls?: MediaItem[]
) {
  const user = await getCurrentUser();
  if (!user) return { success: false as const, error: "Not authenticated" };

  if (!content?.trim() && (!mediaUrls || mediaUrls.length === 0)) {
    return { success: false as const, error: "Message cannot be empty" };
  }

  // Verify user is a participant
  const participant = await db.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
  });

  if (!participant) {
    return { success: false as const, error: "Not a participant" };
  }

  const message = await db.message.create({
    data: {
      conversationId,
      senderId: user.id,
      content: content?.trim() || null,
      mediaUrls:
        mediaUrls && mediaUrls.length > 0
          ? (mediaUrls as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Update conversation timestamp
  await db.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Mark as read for sender
  await db.conversationParticipant.update({
    where: {
      conversationId_userId: { conversationId, userId: user.id },
    },
    data: { lastReadAt: new Date() },
  });

  revalidatePath("/messages");

  return {
    success: true as const,
    message: {
      id: message.id,
      content: message.content,
      mediaUrls: message.mediaUrls as MediaItem[] | null,
      sender: message.sender,
      isOwn: true,
      createdAt: message.createdAt,
    },
  };
}

export async function markConversationRead(conversationId: string) {
  const user = await getCurrentUser();
  if (!user) return;

  await db.conversationParticipant.updateMany({
    where: { conversationId, userId: user.id },
    data: { lastReadAt: new Date() },
  });

  revalidatePath("/messages");
}

export async function getUnreadMessageCount() {
  const user = await getCurrentUser();
  if (!user) return 0;

  const participants = await db.conversationParticipant.findMany({
    where: { userId: user.id },
    select: {
      conversationId: true,
      lastReadAt: true,
    },
  });

  if (participants.length === 0) return 0;

  let unreadCount = 0;
  for (const p of participants) {
    const count = await db.message.count({
      where: {
        conversationId: p.conversationId,
        senderId: { not: user.id },
        ...(p.lastReadAt && { createdAt: { gt: p.lastReadAt } }),
        ...(!p.lastReadAt && {}),
      },
    });
    if (count > 0) unreadCount++;
  }

  return unreadCount;
}

export async function getConversationInfo(conversationId: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      participants: { some: { userId: user.id } },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!conversation) return null;

  const otherParticipant = conversation.participants.find(
    (p) => p.userId !== user.id
  );

  return {
    id: conversation.id,
    otherUser: otherParticipant?.user || null,
  };
}
