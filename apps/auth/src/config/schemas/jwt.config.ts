import { ConfigType } from '@nestjs/config';
import { createNamespacedConfig } from '@app/common';
import { z } from 'zod';

const jwtSchema = z.object({
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z
    .string()
    .regex(/^\d+[smhdw]$/)
    .default('15m'),
  JWT_REFRESH_EXPIRY: z
    .string()
    .regex(/^\d+[smhdw]$/)
    .default('7d'),
});

export const jwtConfig = createNamespacedConfig({
  key: 'jwt',
  schema: jwtSchema,
  map: {
    secret: 'JWT_SECRET',
    accessExpiry: 'JWT_ACCESS_EXPIRY',
    refreshExpiry: 'JWT_REFRESH_EXPIRY',
  },
});

export type JwtConfig = ConfigType<typeof jwtConfig>;
