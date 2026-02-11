import { ConfigType } from '@nestjs/config';
import { createNamespacedConfig } from '@app/common';
import { z } from 'zod';

const databaseSchema = z.object({
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_NAME: z.string(),
});

export const databaseConfig = createNamespacedConfig({
  key: 'database',
  schema: databaseSchema,
  map: { host: 'DB_HOST', port: 'DB_PORT', name: 'DB_NAME' },
});

export type DatabaseConfig = ConfigType<typeof databaseConfig>;
