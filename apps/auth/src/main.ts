import { NestFactory } from '@nestjs/core';
import { AppLogger } from '@app/common';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule, { bufferLogs: true });
  app.useLogger(app.get(AppLogger));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
