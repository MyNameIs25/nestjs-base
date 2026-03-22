import type { ModuleMetadata } from '@nestjs/common';
import type { InjectionToken, OptionalFactoryDependency } from '@nestjs/common';

export interface EmailClientOptions {
  url: string;
}

export interface EmailClientAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  inject?: (InjectionToken | OptionalFactoryDependency)[];
  useFactory: (
    ...args: unknown[]
  ) => EmailClientOptions | Promise<EmailClientOptions>;
}
