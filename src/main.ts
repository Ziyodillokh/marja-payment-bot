// CourseBot bootstrap fayli.
// - NestJS HTTP serverini ishga tushiradi (admin panel REST API uchun).
// - BotService konstruktorida grammY bot polling/webhook rejimida ishga tushadi.
// - SIGTERM/SIGINT da queue'lar va bot graceful yopiladi.

import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'bot/webhook', method: RequestMethod.POST }],
  });
  app.enableCors({ origin: true, credentials: true });
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = Number(config.get<string>('PORT') ?? 3000);

  await app.listen(port);
  Logger.log(`🚀 Application listening on http://localhost:${port}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  Logger.error('Failed to bootstrap application', err, 'Bootstrap');
  process.exit(1);
});
