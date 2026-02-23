import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod';
import helmet from 'helmet';
import { AppLogger } from '@app/common';
import { AuthModule } from './auth.module';
import { AuthConfigService } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AuthModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(AppLogger));
  app.useGlobalPipes(new ZodValidationPipe());

  const { app: appConfig, security } = app.get(AuthConfigService);
  const isDev = appConfig.nodeEnv !== 'production';

  const corsOrigins = security.corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: isDev ? true : corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  });

  app.use(
    helmet({
      contentSecurityPolicy: isDev ? false : undefined,
    }),
  );

  if (isDev) {
    const config = new DocumentBuilder()
      .setTitle('Auth Service')
      .setDescription('Authentication API with pluggable strategies')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const rawDocument = SwaggerModule.createDocument(app, config);
    const document = cleanupOpenApiDoc(rawDocument);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
