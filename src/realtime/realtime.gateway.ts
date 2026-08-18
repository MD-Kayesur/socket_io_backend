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
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:3000",

    credentials: true,
  },
})
export class RealtimeGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(socket: Socket) {
    console.log(
      `Socket connected: ${socket.id}`
    );
  }

  handleDisconnect(socket: Socket) {
    console.log(
      `Socket disconnected: ${socket.id}`
    );
  }

  /**
   * Join personal user room
   */
  @SubscribeMessage("join-user")
  handleJoinUser(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      userId: string;
    },
  ) {
    const room = `user:${data.userId}`;

    socket.join(room);

    console.log(
      `Socket ${socket.id} joined ${room}`
    );

    socket.emit("joined-user", {
      userId: data.userId,
    });
  }

  /**
   * Send message
   */
  @SubscribeMessage("sendMessage")
  handleSendMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody()
    data: {
      senderId: string;
      recipientId: string;
      text: string;
    },
  ) {
    const message = {
      id: crypto.randomUUID(),
      senderId: data.senderId,
      recipientId: data.recipientId,
      text: data.text,
      timestamp: new Date().toISOString(),
    };

    /**
     * Send message to recipient.
     */
    this.server
      .to(`user:${data.recipientId}`)
      .emit("receiveMessage", message);

    /**
     * Send acknowledgement to sender.
     */
    socket.emit("messageSent", message);
  }

  /**
   * Typing event
   */
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