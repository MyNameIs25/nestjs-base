import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PoolClient } from 'pg';

export class ManagedTransaction {
  readonly db: NodePgDatabase;
  private settled = false;

  constructor(private readonly client: PoolClient) {
    this.db = drizzle(client);
  }

  async commit(): Promise<void> {
    if (this.settled) return;
    try {
      await this.client.query('COMMIT');
    } finally {
      this.settled = true;
      this.client.release();
    }
  }

  async rollback(): Promise<void> {
    if (this.settled) return;
    try {
      await this.client.query('ROLLBACK');
    } finally {
      this.settled = true;
      this.client.release();
    }
  }
}
