import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";

import { Server, Socket } from "socket.io";
import { MessagesService } from "../messages/messages.service";
import { GroupsService } from "../groups/groups.service";

@WebSocketGateway({
  namespace: "/realtime",
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messagesService: MessagesService,
    private readonly groupsService: GroupsService
  ) {}

  handleConnection(socket: Socket) {
    console.log(`Socket connected: ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    console.log(`Socket disconnected: ${socket.id}`);
  }

  @SubscribeMessage("join-user")
  async handleJoinUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      userId: string;
    },
  ) {
    if (!data?.userId || data.userId === "user-me") {
      console.log(`Socket ${socket.id} blocked from joining: Invalid or guest user`);
      return;
    }
    const room = `user:${data.userId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined ${room}`);

    // Auto-join all group rooms this user belongs to
    try {
      const userGroups = await this.groupsService.getUserGroups(data.userId);
      for (const group of userGroups) {
        socket.join(`group:${group.id}`);
        console.log(`Socket ${socket.id} auto-joined group:${group.id}`);
      }
    } catch (err) {
      console.error("Failed to auto-join user groups:", err.message);
    }

    socket.emit("joined-user", {
      userId: data.userId,
    });
  }

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      senderId: string;
      senderName?: string;
      senderAvatar?: string;
      recipientId: string;
      text: string;
    },
  ) {
    if (!data?.senderId || data.senderId === "user-me") {
      console.log("Gateway rejected sendMessage: User must create an account first");
      socket.emit("errorMessage", {
        message: "You must create an account or log in to send messages.",
      });
      return;
    }

    console.log("Gateway received sendMessage:", data);

    let dbMessage: any = null;
    try {
      // Save message into PostgreSQL via MessagesService
      dbMessage = await this.messagesService.createMessage(
        data.senderId,
        data.recipientId,
        data.text
      );
      console.log("Successfully saved message to PostgreSQL:", dbMessage.id);
    } catch (err) {
      console.error("Failed to save message to database:", err.message);
    }

    const timestamp = dbMessage?.createdAt
      ? new Date(dbMessage.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const message = {
      id: dbMessage?.id || crypto.randomUUID(),
      senderId: data.senderId,
      senderName: data.senderName || "User",
      senderAvatar: data.senderAvatar,
      recipientId: data.recipientId,
      text: data.text,
      timestamp,
      createdAt: dbMessage?.createdAt || new Date().toISOString(),
      status: "sent",
    };

    // Emit to specific recipient room
    this.server
      .to(`user:${data.recipientId}`)
      .emit("receiveMessage", message);

    console.log(`Emitted receiveMessage to room user:${data.recipientId}`);

    // Emit confirmation to sender room (handles multi-tab sync as well)
    this.server
      .to(`user:${data.senderId}`)
      .emit("messageSent", message);
  }

  @SubscribeMessage("markAsRead")
  handleMarkAsRead(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      messageId?: string;
      senderId: string;
      recipientId: string;
    },
  ) {
    this.server.to(`user:${data.senderId}`).emit("messagesRead", {
      senderId: data.senderId,
      recipientId: data.recipientId,
      messageId: data.messageId,
    });
  }

  @SubscribeMessage("typing")
  handleTyping(
    @MessageBody()
    data: {
      senderId: string;
      senderName?: string;
      recipientId?: string;
      groupId?: string;
    },
  ) {
    if (data.groupId) {
      this.server.to(`group:${data.groupId}`).emit("userTyping", {
        senderId: data.senderId,
        senderName: data.senderName || "Group member",
        groupId: data.groupId,
      });
    } else if (data.recipientId) {
      this.server.to(`user:${data.recipientId}`).emit("userTyping", {
        senderId: data.senderId,
        senderName: data.senderName,
      });
    }
  }

  @SubscribeMessage("deleteMessage")
  async handleDeleteMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      messageId: string;
      userId: string;
      recipientId: string;
      mode: "everyone" | "me";
    },
  ) {
    try {
      await this.messagesService.deleteMessage(data.messageId, data.userId, data.mode);

      if (data.mode === "everyone") {
        this.server.to(`user:${data.recipientId}`).emit("messageDeleted", {
          messageId: data.messageId,
          mode: "everyone",
        });
        this.server.to(`user:${data.userId}`).emit("messageDeleted", {
          messageId: data.messageId,
          mode: "everyone",
        });
      } else {
        socket.emit("messageDeleted", {
          messageId: data.messageId,
          mode: "me",
        });
      }
    } catch (err) {
      console.error("Failed to delete message via gateway:", err.message);
      socket.emit("errorMessage", { message: err.message });
    }
  }

  @SubscribeMessage("join-group")
  handleJoinGroup(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { groupId: string }
  ) {
    if (data?.groupId) {
      const room = `group:${data.groupId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined group room: ${room}`);
    }
  }

  @SubscribeMessage("sendGroupMessage")
  async handleSendGroupMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      groupId: string;
      senderId: string;
      text: string;
    }
  ) {
    if (!data?.groupId || !data?.senderId) return;

    // Verify sender is still a member of the group
    const isMember = await this.groupsService.isGroupMember(
      data.groupId,
      data.senderId
    );
    if (!isMember) {
      socket.emit("removedFromGroup", {
        groupId: data.groupId,
        userId: data.senderId,
      });
      socket.emit("errorMessage", {
        message:
          "You cannot send messages because you were removed from this group.",
      });
      return;
    }

    try {
      const savedMsg = await this.groupsService.createGroupMessage(
        data.groupId,
        data.senderId,
        data.text
      );

      const messagePayload = {
        id: savedMsg.id,
        groupId: savedMsg.groupId,
        senderId: savedMsg.senderId,
        senderName: savedMsg.sender?.name || "User",
        senderAvatar: savedMsg.sender?.avatar,
        text: savedMsg.text,
        timestamp: new Date(savedMsg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        createdAt: savedMsg.createdAt.toISOString(),
        status: "delivered",
        isGroup: true,
      };

      // 1. Broadcast message to group room
      this.server
        .to(`group:${data.groupId}`)
        .emit("receiveGroupMessage", messagePayload);

      // 2. ALSO send directly to every group member's user room user:${memberId}
      const groupDetails = await this.groupsService.getGroupById(data.groupId);
      if (groupDetails?.members) {
        for (const member of groupDetails.members) {
          if (member.id !== data.senderId) {
            this.server
              .to(`user:${member.id}`)
              .emit("receiveGroupMessage", messagePayload);
          }
        }
      }

      console.log(
        `Emitted receiveGroupMessage to group:${data.groupId} and member user rooms`
      );
    } catch (err) {
      console.error("Failed to send group message:", err.message);
      socket.emit("errorMessage", { message: err.message });
    }
  }

  @SubscribeMessage("notifyGroupCreated")
  async handleNotifyGroupCreated(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      group: any;
      memberIds: string[];
    }
  ) {
    if (data?.memberIds?.length) {
      socket.join(`group:${data.group.id}`);

      for (const userId of data.memberIds) {
        this.server.to(`user:${userId}`).emit("addedToGroup", data.group);
      }
    }
  }

  @SubscribeMessage("notifyMemberRemoved")
  handleNotifyMemberRemoved(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      groupId: string;
      userId: string;
    }
  ) {
    if (data?.groupId && data?.userId) {
      // Send notification to the removed member
      this.server.to(`user:${data.userId}`).emit("removedFromGroup", {
        groupId: data.groupId,
        userId: data.userId,
      });

      // Notify other group members so their UI refetches/updates
      this.server.to(`group:${data.groupId}`).emit("memberRemovedFromGroup", {
        groupId: data.groupId,
        userId: data.userId,
      });
    }
  }
}

