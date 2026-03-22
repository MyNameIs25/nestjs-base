import { ConfigType } from '@nestjs/config';
import { createNamespacedConfig } from '@app/common';
import { z } from 'zod';

const emailSchema = z.object({
  EMAIL_GRPC_URL: z.string().default('localhost:50051'),
});

export const emailConfig = createNamespacedConfig({
  key: 'email',
  schema: emailSchema,
  map: {
    grpcUrl: 'EMAIL_GRPC_URL',
  },
});

export type EmailConfig = ConfigType<typeof emailConfig>;
