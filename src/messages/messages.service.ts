import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async createMessage(senderId: string, recipientId: string, text: string) {
    return this.prisma.message.create({
      data: {
        senderId,
        recipientId,
        text,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
        recipient: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });
  }

  async getConversationMessages(user1Id: string, user2Id: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        AND: [
          {
            OR: [
              { senderId: user1Id, recipientId: user2Id },
              { senderId: user2Id, recipientId: user1Id },
            ],
          },
          { deletedForEveryone: false },
          {
            NOT: {
              AND: [{ senderId: user1Id }, { deletedBySender: true }],
            },
          },
          {
            NOT: {
              AND: [{ recipientId: user1Id }, { deletedByRecipient: true }],
            },
          },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
        recipient: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.sender?.name || "User",
      senderAvatar: msg.sender?.avatar,
      recipientId: msg.recipientId,
      text: msg.text,
      timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAt: msg.createdAt,
      status: "delivered" as const,
    }));
  }

  async deleteMessage(messageId: string, userId: string, mode: "everyone" | "me") {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error("Message not found");
    }

    if (mode === "everyone") {
      if (message.senderId !== userId) {
        throw new Error("Only the sender can delete a message for everyone");
      }

      return this.prisma.message.update({
        where: { id: messageId },
        data: { deletedForEveryone: true },
      });
    } else {
      // mode === "me"
      const dataToUpdate: any = {};
      if (message.senderId === userId) {
        dataToUpdate.deletedBySender = true;
      }
      if (message.recipientId === userId) {
        dataToUpdate.deletedByRecipient = true;
      }

      return this.prisma.message.update({
        where: { id: messageId },
        data: dataToUpdate,
      });
    }
  }

  async getUserConversations(userId: string) {
    // Find all distinct users with whom userId has exchanged messages
    const messages = await this.prisma.message.findMany({
      where: {
        AND: [
          { OR: [{ senderId: userId }, { recipientId: userId }] },
          { deletedForEveryone: false },
          {
            NOT: {
              AND: [{ senderId: userId }, { deletedBySender: true }],
            },
          },
          {
            NOT: {
              AND: [{ recipientId: userId }, { deletedByRecipient: true }],
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
        recipient: { select: { id: true, name: true, avatar: true } },
      },
    });

    const contactsMap = new Map<string, any>();

    for (const msg of messages) {
      const otherUser = msg.senderId === userId ? msg.recipient : msg.sender;
      if (!otherUser || otherUser.id === userId) continue;

      if (!contactsMap.has(otherUser.id)) {
        contactsMap.set(otherUser.id, {
          id: otherUser.id,
          name: otherUser.name,
          avatar:
            otherUser.avatar ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
          status: "online",
          lastMessage: msg.text,
          lastMessageTime: new Date(msg.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          unreadCount: 0,
        });
      }
    }

    return Array.from(contactsMap.values());
  }
}
