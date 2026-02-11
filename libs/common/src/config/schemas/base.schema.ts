import { ConfigType } from '@nestjs/config';
import { z } from 'zod';
import { createNamespacedConfig } from '../factories/namespaced-config.factory';

const appSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  SERVICE_NAME: z.string(),
});

export const appConfig = createNamespacedConfig({
  key: 'app',
  schema: appSchema,
});

export type AppConfig = ConfigType<typeof appConfig>;
