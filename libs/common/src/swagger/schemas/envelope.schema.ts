import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export function createSuccessEnvelopeSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    timestamp: z.string().datetime(),
    traceId: z.string(),
  });
}

const ErrorResponseSchema = z.object({
  success: z.literal(false),
  code: z.string(),
  message: z.string(),
  devMessage: z.string().optional(),
  timestamp: z.string().datetime(),
  traceId: z.string(),
});

export class ErrorResponseDto extends createZodDto(ErrorResponseSchema) {}
