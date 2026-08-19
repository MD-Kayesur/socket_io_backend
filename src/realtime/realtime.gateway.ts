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
<<<<<<< HEAD
    if (!data?.userId || data.userId === "user-me") {
      console.log(`Socket ${socket.id} blocked from joining: Invalid or guest user`);
      return;
    }
=======
    if (!data?.userId) return;
>>>>>>> 073d705d8c8bb97d9ea2f15541094e64a90a7b55
    const room = `user:${data.userId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined ${room}`);

    socket.emit("joined-user", {
      userId: data.userId,
    });
  }

  @SubscribeMessage("sendMessage")
  handleSendMessage(
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
<<<<<<< HEAD
    if (!data?.senderId || data.senderId === "user-me") {
      console.log("Gateway rejected sendMessage: User must create an account first");
      socket.emit("errorMessage", {
        message: "You must create an account or log in to send messages.",
      });
      return;
    }

=======
>>>>>>> 073d705d8c8bb97d9ea2f15541094e64a90a7b55
    console.log("Gateway received sendMessage:", data);
    const message = {
      id: crypto.randomUUID(),
      senderId: data.senderId,
      senderName: data.senderName || "User",
      senderAvatar: data.senderAvatar,
      recipientId: data.recipientId,
      text: data.text,
      timestamp: new Date().toISOString(),
    };

    // Emit to specific recipient room
    this.server
      .to(`user:${data.recipientId}`)
      .emit("receiveMessage", message);

    console.log(`Emitted receiveMessage to room user:${data.recipientId}`);

    // Send acknowledgement to sender
    socket.emit("messageSent", message);
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
}
