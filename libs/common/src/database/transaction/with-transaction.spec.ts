/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
import { withTransaction } from './with-transaction.util';

describe('withTransaction', () => {
  it('should call withTransaction on each repository with the tx', () => {
    const mockTx = { select: jest.fn() } as any;
    const cloneA = { name: 'cloneA' };
    const cloneB = { name: 'cloneB' };
    const repoA = { withTransaction: jest.fn().mockReturnValue(cloneA) } as any;
    const repoB = { withTransaction: jest.fn().mockReturnValue(cloneB) } as any;

    const [a, b] = withTransaction(mockTx, repoA, repoB);

    expect(repoA.withTransaction).toHaveBeenCalledWith(mockTx);
    expect(repoB.withTransaction).toHaveBeenCalledWith(mockTx);
    expect(a).toBe(cloneA);
    expect(b).toBe(cloneB);
  });

  it('should return an empty array when no repos are provided', () => {
    const mockTx = {} as any;
    const result = withTransaction(mockTx);
    expect(result).toEqual([]);
  });

  it('should handle a single repository', () => {
    const mockTx = {} as any;
    const clone = { name: 'clone' };
    const repo = { withTransaction: jest.fn().mockReturnValue(clone) } as any;

    const [result] = withTransaction(mockTx, repo);

    expect(repo.withTransaction).toHaveBeenCalledWith(mockTx);
    expect(result).toBe(clone);
  });
});
