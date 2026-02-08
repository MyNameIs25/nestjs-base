// libs/common/src/config/app-config.module.ts
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { z } from 'zod';
import { baseConfigSchema } from './base.config';
import { AppConfigOptions } from './config.type';

@Module({})
export class AppConfigModule {
  static forRoot<T extends z.ZodObject<any>>(
    options: AppConfigOptions<T>,
  ): DynamicModule {
    const { schema, envFilePath } = options;

    const mergedSchema = baseConfigSchema.merge(schema);

    return {
      module: AppConfigModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: envFilePath ?? '.env',
          validate: (raw) => {
            const result = mergedSchema.safeParse(raw);
            if (!result.success) {
              const formatted = result.error.issues
                .map((i) => `  ${i.path.join('.')}: ${i.message}`)
                .join('\n');
              // 启动时直接 crash，别带着错误配置跑
              throw new Error(`Config validation failed:\n${formatted}`);
            }
            return result.data;
          },
        }),
      ],
    };
  }
}
