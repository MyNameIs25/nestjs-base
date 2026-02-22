/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { eq, SQL } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel, Table } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PgColumn } from 'drizzle-orm/pg-core';

export abstract class BaseRepository<
  TTable extends Table,
  TSelect = InferSelectModel<TTable>,
  TInsert = InferInsertModel<TTable>,
> {
  constructor(
    protected readonly db: NodePgDatabase,
    protected readonly table: TTable,
    protected readonly idColumn: PgColumn,
  ) {}

  async findAll(): Promise<TSelect[]> {
    return this.db.select().from(this.table as any) as unknown as Promise<
      TSelect[]
    >;
  }

  async findOne(where: SQL): Promise<TSelect | undefined> {
    const rows = await this.db
      .select()
      .from(this.table as any)
      .where(where)
      .limit(1);
    return rows[0] as TSelect | undefined;
  }

  async findById(id: string | number): Promise<TSelect | undefined> {
    return this.findOne(eq(this.idColumn, id));
  }

  async create(data: TInsert): Promise<TSelect> {
    const rows = await (this.db as any)
      .insert(this.table)
      .values(data)
      .returning();
    const row = rows[0] as TSelect | undefined;
    if (!row) {
      throw new Error('Insert did not return the created row');
    }
    return row;
  }

  async createMany(data: TInsert[]): Promise<TSelect[]> {
    return (this.db as any)
      .insert(this.table)
      .values(data)
      .returning() as Promise<TSelect[]>;
  }

  async update(where: SQL, data: Partial<TInsert>): Promise<TSelect[]> {
    return (this.db as any)
      .update(this.table)
      .set(data)
      .where(where)
      .returning() as Promise<TSelect[]>;
  }

  async updateById(
    id: string | number,
    data: Partial<TInsert>,
  ): Promise<TSelect | undefined> {
    const rows = await this.update(eq(this.idColumn, id), data);
    return rows[0];
  }

  async delete(where: SQL): Promise<TSelect[]> {
    return (this.db as any)
      .delete(this.table)
      .where(where)
      .returning() as Promise<TSelect[]>;
  }

  async deleteById(id: string | number): Promise<TSelect | undefined> {
    const rows = await this.delete(eq(this.idColumn, id));
    return rows[0];
  }
}
