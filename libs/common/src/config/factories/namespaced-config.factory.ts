import { registerAs } from '@nestjs/config';
import { ConfigFactoryKeyHost } from '@nestjs/config';
import { z } from 'zod';

export function createNamespacedConfig<
  TSchema extends z.ZodObject<any>,
>(options: {
  key: string;
  schema: TSchema;
}): (() => z.infer<TSchema>) & ConfigFactoryKeyHost<z.infer<TSchema>> {
  const { key, schema } = options;

  const factory = registerAs(key, () => {
    const result = schema.safeParse(process.env);
    if (!result.success) {
      const formatted = result.error.issues
        .map(
          (i: z.core.$ZodIssue) =>
            `  ${i.path.map(String).join('.')}: ${i.message}`,
        )
        .join('\n');
      throw new Error(
        `Config validation failed for namespace "${key}":\n${formatted}`,
      );
    }

    return result.data as z.infer<TSchema>;
  });

  return factory;
}
