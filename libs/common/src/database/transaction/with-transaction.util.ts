import type { Table } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { BaseRepository } from '../repository/base.repository';

export function withTransaction<T extends BaseRepository<Table>[]>(
  tx: NodePgDatabase,
  ...repos: [...T]
): [...T] {
  return repos.map((repo) => repo.withTransaction(tx)) as [...T];
}
