import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RefreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .length(64)
    .regex(/^[0-9a-f]+$/),
});

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}
