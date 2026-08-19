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

  constructor(private readonly messagesService: MessagesService) {}

  handleConnection(socket: Socket) {
    console.log(`Socket connected: ${socket.id}`);
  }

  handleDisconnect(socket: Socket) {
    console.log(`Socket disconnected: ${socket.id}`);
  }

  @SubscribeMessage("join-user")
  handleJoinUser(
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
      recipientId: string;
    },
  ) {
    this.server
      .to(`user:${data.recipientId}`)
      .emit("userTyping", {
        senderId: data.senderId,
      });
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
}

