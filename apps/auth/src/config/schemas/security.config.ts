import { ConfigType } from '@nestjs/config';
import { createNamespacedConfig } from '@app/common';
import { z } from 'zod';

const securitySchema = z.object({
  CORS_ORIGIN: z.string().default(''),
});

export const securityConfig = createNamespacedConfig({
  key: 'security',
  schema: securitySchema,
  map: {
    corsOrigin: 'CORS_ORIGIN',
  },
});

export type SecurityConfig = ConfigType<typeof securityConfig>;
