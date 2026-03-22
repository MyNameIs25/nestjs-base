import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createSuccessEnvelopeSchema } from '@app/common';

const HealthDataSchema = z.object({
  status: z.string(),
});

export class HealthResponseDto extends createZodDto(
  createSuccessEnvelopeSchema(HealthDataSchema),
) {}
