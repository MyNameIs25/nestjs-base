import { Inject, Injectable } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { InjectDrizzle } from '../database.decorator';
import { PG_POOL } from '../database.constants';
import { ManagedTransaction } from './managed-transaction';

@Injectable()
export class TransactionManager {
  constructor(
    @InjectDrizzle() private readonly db: NodePgDatabase,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  async run<T>(callback: (tx: NodePgDatabase) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  async begin(): Promise<ManagedTransaction> {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return new ManagedTransaction(client);
  }
}
