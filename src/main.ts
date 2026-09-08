import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendUrl = process.env.FRONTEND_URL;
  app.enableCors({
    origin: frontendUrl
      ? frontendUrl.includes(",")
        ? frontendUrl.split(",").map((s) => s.trim())
        : frontendUrl
      : true,
    credentials: true,
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
