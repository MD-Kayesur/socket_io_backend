import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log(
        `database connection succesfully port ${process.env.PORT}`
      );
    } catch (error) {
      console.log("database connection failed:", error.message);
    }
  }
}
