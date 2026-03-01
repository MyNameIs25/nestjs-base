import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { createSuccessEnvelopeSchema } from '@app/common';

const MessageDataSchema = z.object({
  message: z.string(),
});

export class MessageResponseDto extends createZodDto(
  createSuccessEnvelopeSchema(MessageDataSchema),
) {}
