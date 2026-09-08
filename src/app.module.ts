import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { MessagesModule } from "./messages/messages.module";
import { GroupsModule } from "./groups/groups.module";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    AuthModule,
    UsersModule,
    MessagesModule,
    GroupsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

