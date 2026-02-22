/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { AppDatabaseModule } from './database.module';
import { DRIZZLE } from './database.constants';

describe('AppDatabaseModule', () => {
  describe('forRoot', () => {
    it('should return a DynamicModule with global: true', () => {
      const result = AppDatabaseModule.forRoot({
        pool: { host: 'localhost', port: 5432 },
      });

      expect(result.module).toBe(AppDatabaseModule);
      expect(result.global).toBe(true);
    });

    it('should provide DRIZZLE token and export it', () => {
      const result = AppDatabaseModule.forRoot({
        pool: { host: 'localhost', port: 5432 },
      });

      const providers = result.providers as any[];
      const drizzleProvider = providers.find((p) => p.provide === DRIZZLE);
      expect(drizzleProvider).toBeDefined();
      expect(drizzleProvider.useFactory).toBeInstanceOf(Function);

      expect(result.exports).toContain(DRIZZLE);
    });

    it('should have a PG_POOL provider', () => {
      const result = AppDatabaseModule.forRoot({
        pool: { host: 'localhost', port: 5432 },
      });

      const providers = result.providers as any[];
      // PG_POOL is a Symbol, so find by type
      const poolProvider = providers.find(
        (p) => typeof p.provide === 'symbol' && p.provide !== DRIZZLE,
      );
      expect(poolProvider).toBeDefined();
      expect(poolProvider.useFactory).toBeInstanceOf(Function);
    });
  });

  describe('forRootAsync', () => {
    it('should return a DynamicModule with global: true', () => {
      const result = AppDatabaseModule.forRootAsync({
        useFactory: () => ({ pool: { host: 'localhost' } }),
      });

      expect(result.module).toBe(AppDatabaseModule);
      expect(result.global).toBe(true);
    });

    it('should include imports when provided', () => {
      const mockModule = class MockModule {};
      const result = AppDatabaseModule.forRootAsync({
        imports: [mockModule],
        useFactory: () => ({ pool: { host: 'localhost' } }),
      });

      expect(result.imports).toContain(mockModule);
    });

    it('should default imports to empty array when not provided', () => {
      const result = AppDatabaseModule.forRootAsync({
        useFactory: () => ({ pool: { host: 'localhost' } }),
      });

      expect(result.imports).toEqual([]);
    });

    it('should provide DRIZZLE token and export it', () => {
      const result = AppDatabaseModule.forRootAsync({
        useFactory: () => ({ pool: { host: 'localhost' } }),
      });

      const providers = result.providers as any[];
      const drizzleProvider = providers.find((p) => p.provide === DRIZZLE);
      expect(drizzleProvider).toBeDefined();

      expect(result.exports).toContain(DRIZZLE);
    });

    it('should pass inject tokens to PG_POOL provider', () => {
      const TOKEN = Symbol('CONFIG');
      const result = AppDatabaseModule.forRootAsync({
        inject: [TOKEN],
        useFactory: () => ({ pool: { host: 'localhost' } }),
      });

      const providers = result.providers as any[];
      const poolProvider = providers.find(
        (p) => typeof p.provide === 'symbol' && p.provide !== DRIZZLE,
      );
      expect(poolProvider.inject).toContain(TOKEN);
    });

    it('should default inject to empty array when not provided', () => {
      const result = AppDatabaseModule.forRootAsync({
        useFactory: () => ({ pool: { host: 'localhost' } }),
      });

      const providers = result.providers as any[];
      const poolProvider = providers.find(
        (p) => typeof p.provide === 'symbol' && p.provide !== DRIZZLE,
      );
      expect(poolProvider.inject).toEqual([]);
    });
  });

  describe('onApplicationShutdown', () => {
    it('should call pool.end() on shutdown', async () => {
      const mockPool = {
        end: jest.fn().mockResolvedValue(undefined),
      } as any;
      const module = new AppDatabaseModule(mockPool);

      await module.onApplicationShutdown();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});
