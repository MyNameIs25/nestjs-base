/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { eq } from 'drizzle-orm';
import { pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { BaseRepository } from './base.repository';

const testTable = pgTable('test', {
  id: serial().primaryKey(),
  name: varchar({ length: 100 }),
});

type TestSelect = typeof testTable.$inferSelect;
type TestInsert = typeof testTable.$inferInsert;

// Chainable mock builder — each method returns an object with the next link
function createMockDb() {
  const mockReturning = jest.fn();
  const mockLimit = jest.fn();
  const mockWhere = jest.fn();
  const mockFrom = jest.fn();
  const mockValues = jest.fn();
  const mockSet = jest.fn();

  // select().from(table) → chainable → .where() → .limit()
  mockLimit.mockReturnValue([]);
  mockWhere.mockReturnValue({ limit: mockLimit });
  mockFrom.mockReturnValue({ where: mockWhere, limit: mockLimit });
  const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });

  // insert(table).values(data).returning()
  mockReturning.mockResolvedValue([]);
  mockValues.mockReturnValue({ returning: mockReturning });
  const mockInsert = jest.fn().mockReturnValue({ values: mockValues });

  // update(table).set(data).where(where).returning()
  const mockUpdateWhere = jest
    .fn()
    .mockReturnValue({ returning: mockReturning });
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });

  // delete(table).where(where).returning()
  const mockDeleteWhere = jest
    .fn()
    .mockReturnValue({ returning: mockReturning });
  const mockDelete = jest.fn().mockReturnValue({ where: mockDeleteWhere });

  const db = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  };

  return {
    db: db as any,
    mocks: {
      select: mockSelect,
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
      insert: mockInsert,
      values: mockValues,
      returning: mockReturning,
      update: mockUpdate,
      set: mockSet,
      updateWhere: mockUpdateWhere,
      delete: mockDelete,
      deleteWhere: mockDeleteWhere,
    },
  };
}

class TestRepository extends BaseRepository<
  typeof testTable,
  TestSelect,
  TestInsert
> {
  constructor(db: any) {
    super(db, testTable, testTable.id);
  }
}

describe('BaseRepository', () => {
  let repository: TestRepository;
  let mocks: ReturnType<typeof createMockDb>['mocks'];
  let db: any;

  beforeEach(() => {
    const mock = createMockDb();
    db = mock.db;
    mocks = mock.mocks;
    repository = new TestRepository(db);
  });

  describe('findAll', () => {
    it('should call db.select().from(table) and return array', async () => {
      const rows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      mocks.from.mockReturnValue(rows);

      const result = await repository.findAll();

      expect(mocks.select).toHaveBeenCalled();
      expect(mocks.from).toHaveBeenCalledWith(testTable);
      expect(result).toEqual(rows);
    });
  });

  describe('findOne', () => {
    it('should call db.select().from(table).where(where).limit(1) and return first element', async () => {
      const row = { id: 1, name: 'Alice' };
      mocks.limit.mockReturnValue([row]);

      const whereSql = eq(testTable.id, 1);
      const result = await repository.findOne(whereSql);

      expect(mocks.select).toHaveBeenCalled();
      expect(mocks.from).toHaveBeenCalledWith(testTable);
      expect(mocks.where).toHaveBeenCalledWith(whereSql);
      expect(mocks.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(row);
    });

    it('should return undefined when no rows match', async () => {
      mocks.limit.mockReturnValue([]);

      const result = await repository.findOne(eq(testTable.id, 999));

      expect(result).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should delegate to findOne with eq(idColumn, id)', async () => {
      const row = { id: 1, name: 'Alice' };
      mocks.limit.mockReturnValue([row]);

      const result = await repository.findById(1);

      expect(mocks.select).toHaveBeenCalled();
      expect(mocks.from).toHaveBeenCalledWith(testTable);
      expect(mocks.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(row);
    });
  });

  describe('create', () => {
    it('should call db.insert(table).values(data).returning() and return first element', async () => {
      const newRow = { id: 1, name: 'Alice' };
      mocks.returning.mockResolvedValue([newRow]);

      const result = await repository.create({ name: 'Alice' });

      expect(mocks.insert).toHaveBeenCalledWith(testTable);
      expect(mocks.values).toHaveBeenCalledWith({ name: 'Alice' });
      expect(mocks.returning).toHaveBeenCalled();
      expect(result).toEqual(newRow);
    });
  });

  describe('createMany', () => {
    it('should call db.insert(table).values(data).returning() and return array', async () => {
      const rows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      mocks.returning.mockResolvedValue(rows);

      const result = await repository.createMany([
        { name: 'Alice' },
        { name: 'Bob' },
      ]);

      expect(mocks.insert).toHaveBeenCalledWith(testTable);
      expect(mocks.values).toHaveBeenCalledWith([
        { name: 'Alice' },
        { name: 'Bob' },
      ]);
      expect(mocks.returning).toHaveBeenCalled();
      expect(result).toEqual(rows);
    });
  });

  describe('update', () => {
    it('should call db.update(table).set(data).where(where).returning()', async () => {
      const updatedRows = [{ id: 1, name: 'Updated' }];
      mocks.returning.mockResolvedValue(updatedRows);

      const whereSql = eq(testTable.id, 1);
      const result = await repository.update(whereSql, { name: 'Updated' });

      expect(mocks.update).toHaveBeenCalledWith(testTable);
      expect(mocks.set).toHaveBeenCalledWith({ name: 'Updated' });
      expect(mocks.updateWhere).toHaveBeenCalledWith(whereSql);
      expect(mocks.returning).toHaveBeenCalled();
      expect(result).toEqual(updatedRows);
    });
  });

  describe('updateById', () => {
    it('should delegate to update with eq(idColumn, id) and return first element', async () => {
      const updatedRow = { id: 1, name: 'Updated' };
      mocks.returning.mockResolvedValue([updatedRow]);

      const result = await repository.updateById(1, { name: 'Updated' });

      expect(mocks.update).toHaveBeenCalledWith(testTable);
      expect(mocks.set).toHaveBeenCalledWith({ name: 'Updated' });
      expect(mocks.returning).toHaveBeenCalled();
      expect(result).toEqual(updatedRow);
    });
  });

  describe('delete', () => {
    it('should call db.delete(table).where(where).returning()', async () => {
      const deletedRows = [{ id: 1, name: 'Alice' }];
      mocks.returning.mockResolvedValue(deletedRows);

      const whereSql = eq(testTable.id, 1);
      const result = await repository.delete(whereSql);

      expect(mocks.delete).toHaveBeenCalledWith(testTable);
      expect(mocks.deleteWhere).toHaveBeenCalledWith(whereSql);
      expect(mocks.returning).toHaveBeenCalled();
      expect(result).toEqual(deletedRows);
    });
  });

  describe('deleteById', () => {
    it('should delegate to delete with eq(idColumn, id) and return first element', async () => {
      const deletedRow = { id: 1, name: 'Alice' };
      mocks.returning.mockResolvedValue([deletedRow]);

      const result = await repository.deleteById(1);

      expect(mocks.delete).toHaveBeenCalledWith(testTable);
      expect(mocks.returning).toHaveBeenCalled();
      expect(result).toEqual(deletedRow);
    });

    it('should return undefined when no rows match', async () => {
      mocks.returning.mockResolvedValue([]);

      const result = await repository.deleteById(999);

      expect(result).toBeUndefined();
    });
  });
});
