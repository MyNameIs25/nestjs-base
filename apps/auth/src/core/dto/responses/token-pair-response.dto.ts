import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createSuccessEnvelopeSchema } from '@app/common';

const TokenPairDataSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export class TokenPairResponseDto extends createZodDto(
  createSuccessEnvelopeSchema(TokenPairDataSchema),
) {}
