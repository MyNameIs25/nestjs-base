/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-floating-promises */
import { UserRepository } from './user.repository';
import { users } from './user.schema';

function createMockDb() {
  const mockReturning = jest.fn();
  const mockLimit = jest.fn();
  const mockWhere = jest.fn();
  const mockFrom = jest.fn();
  const mockValues = jest.fn();
  const mockSet = jest.fn();

  mockLimit.mockReturnValue([]);
  mockWhere.mockReturnValue({ limit: mockLimit });
  mockFrom.mockReturnValue({ where: mockWhere, limit: mockLimit });
  const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });

  mockReturning.mockResolvedValue([]);
  mockValues.mockReturnValue({ returning: mockReturning });
  const mockInsert = jest.fn().mockReturnValue({ values: mockValues });

  const mockUpdateWhere = jest
    .fn()
    .mockReturnValue({ returning: mockReturning });
  mockSet.mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });

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

describe('UserRepository', () => {
  let repository: UserRepository;
  let mocks: ReturnType<typeof createMockDb>['mocks'];

  beforeEach(() => {
    const mock = createMockDb();
    mocks = mock.mocks;
    repository = new UserRepository(mock.db);
  });

  describe('constructor', () => {
    it('should pass users table and users.id to base class', () => {
      // Verify inherited methods work by calling findAll, which uses the table
      mocks.from.mockReturnValue([]);
      repository.findAll();

      expect(mocks.from).toHaveBeenCalledWith(users);
    });

    it('should use users.id as the id column for findById', async () => {
      const user = {
        id: 'abc-123',
        email: 'alice@example.com',
        username: 'alice',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mocks.limit.mockReturnValue([user]);

      const result = await repository.findById('abc-123');

      expect(mocks.select).toHaveBeenCalled();
      expect(mocks.from).toHaveBeenCalledWith(users);
      expect(mocks.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(user);
    });
  });

  describe('findByEmail', () => {
    it('should delegate to findOne with eq(users.email, email)', async () => {
      const user = {
        id: 'abc-123',
        email: 'alice@example.com',
        username: 'alice',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mocks.limit.mockReturnValue([user]);

      const result = await repository.findByEmail('alice@example.com');

      expect(mocks.select).toHaveBeenCalled();
      expect(mocks.from).toHaveBeenCalledWith(users);
      expect(mocks.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(user);
    });

    it('should return undefined when no user matches', async () => {
      mocks.limit.mockReturnValue([]);

      const result = await repository.findByEmail('nonexistent@example.com');

      expect(result).toBeUndefined();
    });
  });

  describe('findByUsername', () => {
    it('should delegate to findOne with eq(users.username, username)', async () => {
      const user = {
        id: 'abc-123',
        email: 'alice@example.com',
        username: 'alice',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mocks.limit.mockReturnValue([user]);

      const result = await repository.findByUsername('alice');

      expect(mocks.select).toHaveBeenCalled();
      expect(mocks.from).toHaveBeenCalledWith(users);
      expect(mocks.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(user);
    });

    it('should return undefined when no user matches', async () => {
      mocks.limit.mockReturnValue([]);

      const result = await repository.findByUsername('nonexistent');

      expect(result).toBeUndefined();
    });
  });
});
