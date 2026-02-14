import { NestFactory } from '@nestjs/core';
import { AppLogger } from '@app/common';
import { PaymentsModule } from './payments.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentsModule, { bufferLogs: true });
  app.useLogger(app.get(AppLogger));
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
