import { join } from 'path';
import { DynamicModule, Module } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { EMAIL_SERVICE_TOKEN, EMAIL_PACKAGE_NAME } from './constants';
import { EmailClientService } from './email-client.service';
import type {
  EmailClientOptions,
  EmailClientAsyncOptions,
} from './types/email-client.type';

const PROTO_PATH = join(process.cwd(), 'proto', 'email.proto');

@Module({})
export class EmailClientModule {
  static forRoot(options: EmailClientOptions): DynamicModule {
    return {
      module: EmailClientModule,
      global: true,
      providers: [
        {
          provide: EMAIL_SERVICE_TOKEN,
          useFactory: () =>
            ClientProxyFactory.create({
              transport: Transport.GRPC,
              options: {
                package: EMAIL_PACKAGE_NAME,
                protoPath: PROTO_PATH,
                url: options.url,
              },
            }),
        },
        EmailClientService,
      ],
      exports: [EmailClientService],
    };
  }

  static forRootAsync(options: EmailClientAsyncOptions): DynamicModule {
    return {
      module: EmailClientModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: EMAIL_SERVICE_TOKEN,
          useFactory: async (...args: unknown[]) => {
            const config = await options.useFactory(...args);
            return ClientProxyFactory.create({
              transport: Transport.GRPC,
              options: {
                package: EMAIL_PACKAGE_NAME,
                protoPath: PROTO_PATH,
                url: config.url,
              },
            });
          },
          inject: options.inject ?? [],
        },
        EmailClientService,
      ],
      exports: [EmailClientService],
    };
  }
}
