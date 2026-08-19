import { Module } from "@nestjs/common";
import { RealtimeGateway } from "./realtime.gateway";
import { MessagesModule } from "../messages/messages.module";
import { GroupsModule } from "../groups/groups.module";

@Module({
  imports: [MessagesModule, GroupsModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}