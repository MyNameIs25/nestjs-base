import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppLogger } from '@app/common';
import { EmailAppModule } from './email-app.module';
import { EmailAppConfigModule, EmailAppConfigService } from './config';

async function bootstrap() {
  const configContext =
    await NestFactory.createApplicationContext(EmailAppConfigModule);
  const config = configContext.get(EmailAppConfigService);
  await configContext.close();

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    EmailAppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'email',
        protoPath: join(process.cwd(), 'proto', 'email.proto'),
        url: config.email.grpcUrl,
      },
      bufferLogs: true,
    },
  );

  app.useLogger(app.get(AppLogger));
  await app.listen();
}
void bootstrap();
