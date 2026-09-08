import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow any requesting origin dynamically (reflects origin for credentials)
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  const port = Number(process.env.PORT) || 8000;

  await app.listen(port, "0.0.0.0");

  console.log(`API running on http://0.0.0.0:${port}`);
  console.log(`Socket.IO running on ws://0.0.0.0:${port}/realtime`);
}

bootstrap();
