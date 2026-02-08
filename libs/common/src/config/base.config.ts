import { z } from 'zod';

export const baseConfigSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  SERVICE_NAME: z.string(),
});

export type BaseConfigSchema = typeof baseConfigSchema;
