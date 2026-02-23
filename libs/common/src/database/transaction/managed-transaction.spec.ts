import type { PoolClient } from 'pg';
import { ManagedTransaction } from './managed-transaction';

describe('ManagedTransaction', () => {
  let mockQuery: jest.Mock;
  let mockRelease: jest.Mock;
  let tx: ManagedTransaction;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockRelease = jest.fn();
    tx = new ManagedTransaction({
      query: mockQuery,
      release: mockRelease,
    } as unknown as PoolClient);
  });

  it('should expose a db property', () => {
    expect(tx.db).toBeDefined();
  });

  describe('commit', () => {
    it('should send COMMIT and release the client', async () => {
      await tx.commit();

      expect(mockQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should be idempotent', async () => {
      await tx.commit();
      await tx.commit();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });
  });

  describe('rollback', () => {
    it('should send ROLLBACK and release the client', async () => {
      await tx.rollback();

      expect(mockQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockRelease).toHaveBeenCalled();
    });

    it('should be idempotent', async () => {
      await tx.rollback();
      await tx.rollback();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockRelease).toHaveBeenCalledTimes(1);
    });

    it('should not rollback after commit', async () => {
      await tx.commit();
      await tx.rollback();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith('COMMIT');
    });
  });
});
