import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z
    .email()
    .max(255)
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[a-z]/, 'Password must contain a lowercase letter')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain a symbol'),
  displayName: z.string().max(100).optional(),
});

export class RegisterDto extends createZodDto(RegisterSchema) {}
