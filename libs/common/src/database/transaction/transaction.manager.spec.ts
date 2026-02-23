import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE, PG_POOL } from '../database.constants';
import { TransactionManager } from './transaction.manager';
import { ManagedTransaction } from './managed-transaction';

describe('TransactionManager', () => {
  let manager: TransactionManager;
  let mockTransaction: jest.Mock;
  let mockPoolConnect: jest.Mock;
  let mockClientQuery: jest.Mock;
  let mockClientRelease: jest.Mock;

  beforeEach(async () => {
    mockTransaction = jest.fn();
    mockClientQuery = jest.fn();
    mockClientRelease = jest.fn();
    mockPoolConnect = jest.fn().mockResolvedValue({
      query: mockClientQuery,
      release: mockClientRelease,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionManager,
        {
          provide: DRIZZLE,
          useValue: { transaction: mockTransaction },
        },
        {
          provide: PG_POOL,
          useValue: { connect: mockPoolConnect },
        },
      ],
    }).compile();

    manager = module.get(TransactionManager);
  });

  describe('run', () => {
    it('should delegate to db.transaction and return the callback result', async () => {
      mockTransaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => cb('mock-tx'),
      );
      const callback = jest.fn().mockResolvedValue('result');

      const result = await manager.run(callback);

      expect(mockTransaction).toHaveBeenCalledWith(callback);
      expect(result).toBe('result');
    });

    it('should propagate errors from the callback', async () => {
      const error = new Error('tx failed');
      mockTransaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => cb('mock-tx'),
      );
      const callback = jest.fn().mockRejectedValue(error);

      await expect(manager.run(callback)).rejects.toThrow('tx failed');
    });
  });

  describe('begin', () => {
    it('should return a ManagedTransaction after BEGIN', async () => {
      const tx = await manager.begin();

      expect(tx).toBeInstanceOf(ManagedTransaction);
      expect(mockPoolConnect).toHaveBeenCalled();
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
    });

    it('should propagate pool connection errors', async () => {
      mockPoolConnect.mockRejectedValue(new Error('pool exhausted'));

      await expect(manager.begin()).rejects.toThrow('pool exhausted');
    });
  });
});
