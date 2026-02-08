import { z } from 'zod';

export interface AppConfigOptions<T extends z.ZodObject<any>> {
  schema: T;
  envFilePath?: string;
}
