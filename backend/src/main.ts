import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(
      AppModule,
    );

  app.useBodyParser('json', {
    limit: '15mb',
  });

  app.useBodyParser('urlencoded', {
    limit: '15mb',
    extended: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(
    process.env.PORT ?? 3000,
  );

  await app.listen(
    port,
    '0.0.0.0',
  );
}

void bootstrap();