import { Module } from "@nestjs/common";

import { PrismaModule } from "./prisma/prisma.module";
import { RealtimeModule } from "./realtime/realtime.module";

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,

    // Other modules
    // AuthModule,
    // UsersModule,
    // DealsModule,
  ],
})
export class AppModule {}



// import { Module } from '@nestjs/common';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
// import { PrismaModule } from './prisma/prisma.module';

// @Module({
//   imports: [PrismaModule],
//   controllers: [AppController],
//   providers: [AppService],
// })
// export class AppModule {}
