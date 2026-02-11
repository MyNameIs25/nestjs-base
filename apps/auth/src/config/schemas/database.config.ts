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
});

export type DatabaseConfig = ConfigType<typeof databaseConfig>;
