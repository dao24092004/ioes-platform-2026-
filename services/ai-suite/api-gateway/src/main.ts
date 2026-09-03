import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  GlobalExceptionFilter,
  HttpExceptionFilter,
  createLogger,
} from '@ioes/common-node';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  const logger = createLogger('AiGateway');

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new GlobalExceptionFilter(), new HttpExceptionFilter());

  // K8s cần drain traffic trước khi tắt — BA_DOCUMENT §8.4 mục 3.
  app.enableShutdownHooks();

  await app.listen(appConfig.port, appConfig.host);
  logger.log(`HTTP listening on ${appConfig.host}:${appConfig.port}`);
}

bootstrap().catch((error: unknown) => {
  const logger = createLogger('AiGateway');
  logger.error(
    `Bootstrap thất bại: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});
