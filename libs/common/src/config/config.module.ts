import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './schemas/base.schema';
import { AppConfigOptions } from './types/config.type';

@Module({})
export class AppConfigModule {
  static forRoot(options: AppConfigOptions = {}): DynamicModule {
    const { namespaces = [] } = options;

    return {
      module: AppConfigModule,
      imports: [
        ConfigModule.forRoot({
          cache: true,
          isGlobal: true,
          load: [appConfig, ...namespaces],
        }),
      ],
      exports: [ConfigModule],
    };
  }
}
