import { registerAs } from '@nestjs/config';
import { ConfigFactoryKeyHost } from '@nestjs/config';
import { z } from 'zod';

export type ObjectMapResult<
  TSchema extends z.ZodObject<any>,
  TMap extends Record<string, keyof z.infer<TSchema>>,
> = {
  [K in keyof TMap]: z.infer<TSchema>[TMap[K] & keyof z.infer<TSchema>];
};

export function createNamespacedConfig<
  TSchema extends z.ZodObject<any>,
  const TMap extends Record<string, keyof z.infer<TSchema>>,
>(options: {
  key: string;
  schema: TSchema;
  map: TMap;
}): (() => ObjectMapResult<TSchema, TMap>) &
  ConfigFactoryKeyHost<ObjectMapResult<TSchema, TMap>> {
  const { key, schema, map } = options;

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

    const mapped: Record<string, unknown> = {};
    for (const [mapKey, envKey] of Object.entries(map)) {
      mapped[mapKey] = result.data[envKey as string];
    }
    return mapped as ObjectMapResult<TSchema, TMap>;
  });

  return factory;
}
