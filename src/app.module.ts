import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { MessagesModule } from "./messages/messages.module";
import { GroupsModule } from "./groups/groups.module";

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    AuthModule,
    UsersModule,
    MessagesModule,
    GroupsModule,
  ],
})
export class AppModule {}

