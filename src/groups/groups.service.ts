import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(
    creatorId: string,
    name: string,
    description?: string,
    avatar?: string,
    memberIds: string[] = []
  ) {
    // Unique list of member IDs including creator
    const uniqueUserIds = Array.from(
      new Set([creatorId, ...memberIds.filter(Boolean)])
    );

    const group = await this.prisma.group.create({
      data: {
        name,
        description,
        avatar:
          avatar ||
          `https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=250&q=80`,
        creatorId,
        members: {
          create: uniqueUserIds.map((userId) => ({
            userId,
            role: userId === creatorId ? "admin" : "member",
          })),
        },
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });

    return group;
  }

  async getUserGroups(userId: string) {
    const groups = await this.prisma.group.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return groups.map((g) => {
      const lastMsg = g.messages[0];
      return {
        id: g.id,
        isGroup: true,
        name: g.name,
        description: g.description,
        avatar: g.avatar,
        creatorId: g.creatorId,
        members: g.members.map((m) => m.user),
        memberCount: g.members.length,
        lastMessage: lastMsg ? `${lastMsg.sender.name}: ${lastMsg.text}` : "Group created",
        lastMessageTime: lastMsg
          ? new Date(lastMsg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Just now",
        updatedAt: g.updatedAt,
      };
    });
  }

  async getGroupById(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    return {
      ...group,
      members: group.members.map((m) => m.user),
      memberCount: group.members.length,
    };
  }

  async addGroupMembers(groupId: string, memberIds: string[]) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${groupId} not found`);
    }

    // Add member records
    await this.prisma.groupMember.createMany({
      data: memberIds.map((userId) => ({
        groupId,
        userId,
        role: "member",
      })),
      skipDuplicates: true,
    });

    return this.getGroupById(groupId);
  }

  async removeGroupMember(groupId: string, userId: string) {
    await this.prisma.groupMember.deleteMany({
      where: { groupId, userId },
    });

    return { success: true, groupId, userId };
  }

  async createGroupMessage(groupId: string, senderId: string, text: string) {
    const message = await this.prisma.message.create({
      data: {
        groupId,
        senderId,
        text,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, email: true },
        },
      },
    });

    // Update group timestamp
    await this.prisma.group.update({
      where: { id: groupId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async getGroupMessages(groupId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        groupId,
        deletedForEveryone: false,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return messages.map((m) => ({
      id: m.id,
      groupId: m.groupId,
      senderId: m.senderId,
      senderName: m.sender.name,
      senderAvatar: m.sender.avatar,
      text: m.text,
      timestamp: new Date(m.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAt: m.createdAt,
      status: "delivered" as const,
    }));
  }

  async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.groupMember.count({
      where: { groupId, userId },
    });
    return count > 0;
  }
}
