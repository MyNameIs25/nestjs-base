import { ConfigType } from '@nestjs/config';
import { createNamespacedConfig } from '@app/common';
import { z } from 'zod';

const emailSchema = z.object({
  EMAIL_PROVIDER: z.enum(['resend']).default('resend'),
  RESEND_API_KEY: z.string(),
  EMAIL_FROM_ADDRESS: z.string().email().default('noreply@idealtech.dev'),
  EMAIL_FROM_NAME: z.string().default('IdealTech'),
  EMAIL_GRPC_URL: z.string().default('0.0.0.0:50051'),
});

export const emailConfig = createNamespacedConfig({
  key: 'email',
  schema: emailSchema,
  map: {
    provider: 'EMAIL_PROVIDER',
    resendApiKey: 'RESEND_API_KEY',
    fromAddress: 'EMAIL_FROM_ADDRESS',
    fromName: 'EMAIL_FROM_NAME',
    grpcUrl: 'EMAIL_GRPC_URL',
  },
});

export type EmailConfig = ConfigType<typeof emailConfig>;
