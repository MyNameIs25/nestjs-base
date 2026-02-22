import type { ModuleMetadata } from '@nestjs/common';
import type { InjectionToken, OptionalFactoryDependency } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PoolConfig } from 'pg';

export type DrizzleDB = NodePgDatabase;

export interface AppDatabaseOptions {
  pool: PoolConfig;
}

export interface AppDatabaseAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  inject?: (InjectionToken | OptionalFactoryDependency)[];
  useFactory: (
    ...args: any[]
  ) => AppDatabaseOptions | Promise<AppDatabaseOptions>;
}
