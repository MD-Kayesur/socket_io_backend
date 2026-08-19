import { Controller, Get, Delete, Query, Param, Body } from "@nestjs/common";
import { MessagesService } from "./messages.service";

@Controller("messages")
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get("conversation")
  async getConversation(
    @Query("user1Id") user1Id: string,
    @Query("user2Id") user2Id: string
  ) {
    if (!user1Id || !user2Id) {
      return [];
    }
    return this.messagesService.getConversationMessages(user1Id, user2Id);
  }

  @Get("conversations/:userId")
  async getUserConversations(@Param("userId") userId: string) {
    if (!userId) {
      return [];
    }
    return this.messagesService.getUserConversations(userId);
  }

  @Delete(":id")
  async deleteMessage(
    @Param("id") id: string,
    @Body() body: { userId: string; mode: "everyone" | "me" }
  ) {
    return this.messagesService.deleteMessage(id, body.userId, body.mode);
  }
}
