import {
  DynamicModule,
  Inject,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import { DRIZZLE } from './database.constants';
import type {
  AppDatabaseAsyncOptions,
  AppDatabaseOptions,
} from './types/database.type';

const PG_POOL = Symbol('PG_POOL');

const DEFAULT_POOL_CONFIG: Partial<PoolConfig> = {
  max: 20,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
};

@Module({})
export class AppDatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }

  static forRoot(options: AppDatabaseOptions): DynamicModule {
    return {
      module: AppDatabaseModule,
      global: true,
      providers: [
        {
          provide: PG_POOL,
          useFactory: () =>
            new Pool({ ...DEFAULT_POOL_CONFIG, ...options.pool }),
        },
        {
          provide: DRIZZLE,
          useFactory: (pool: Pool) => drizzle({ client: pool }),
          inject: [PG_POOL],
        },
      ],
      exports: [DRIZZLE],
    };
  }

  static forRootAsync(options: AppDatabaseAsyncOptions): DynamicModule {
    return {
      module: AppDatabaseModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: PG_POOL,
          useFactory: async (...args: any[]) => {
            const config = await options.useFactory(...args);
            return new Pool({ ...DEFAULT_POOL_CONFIG, ...config.pool });
          },
          inject: options.inject ?? [],
        },
        {
          provide: DRIZZLE,
          useFactory: (pool: Pool) => drizzle({ client: pool }),
          inject: [PG_POOL],
        },
      ],
      exports: [DRIZZLE],
    };
  }
}
