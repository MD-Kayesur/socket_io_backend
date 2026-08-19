import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
} from "@nestjs/common";
import { GroupsService } from "./groups.service";

@Controller("groups")
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  async createGroup(
    @Body()
    body: {
      creatorId: string;
      name: string;
      description?: string;
      avatar?: string;
      memberIds: string[];
    }
  ) {
    return this.groupsService.createGroup(
      body.creatorId,
      body.name,
      body.description,
      body.avatar,
      body.memberIds || []
    );
  }

  @Get("user/:userId")
  async getUserGroups(@Param("userId") userId: string) {
    return this.groupsService.getUserGroups(userId);
  }

  @Get(":groupId")
  async getGroupById(@Param("groupId") groupId: string) {
    return this.groupsService.getGroupById(groupId);
  }

  @Post(":groupId/members")
  async addGroupMembers(
    @Param("groupId") groupId: string,
    @Body() body: { memberIds: string[] }
  ) {
    return this.groupsService.addGroupMembers(groupId, body.memberIds || []);
  }

  @Delete(":groupId/members/:userId")
  async removeGroupMember(
    @Param("groupId") groupId: string,
    @Param("userId") userId: string
  ) {
    return this.groupsService.removeGroupMember(groupId, userId);
  }

  @Get(":groupId/messages")
  async getGroupMessages(@Param("groupId") groupId: string) {
    return this.groupsService.getGroupMessages(groupId);
  }
}
