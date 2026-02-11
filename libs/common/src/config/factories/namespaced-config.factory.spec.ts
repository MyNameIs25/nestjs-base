import { z } from 'zod';
import { createNamespacedConfig } from './namespaced-config.factory';

describe('createNamespacedConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const schema = z.object({
    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.coerce.number().default(5432),
  });

  describe('object map', () => {
    const factory = createNamespacedConfig({
      key: 'database',
      schema,
      map: { host: 'DB_HOST', port: 'DB_PORT' },
    });

    it('should have a KEY property matching the key', () => {
      expect(factory.KEY).toBe('CONFIGURATION(database)');
    });

    it('should be callable as a function', () => {
      expect(typeof factory).toBe('function');
    });

    it('should have an asProvider method', () => {
      expect(typeof factory.asProvider).toBe('function');
    });

    it('should return mapped values using defaults', () => {
      const result = factory();
      expect(result).toEqual({ host: 'localhost', port: 5432 });
    });

    it('should return mapped values from process.env', () => {
      process.env.DB_HOST = 'db.example.com';
      process.env.DB_PORT = '3306';

      const result = factory();
      expect(result).toEqual({ host: 'db.example.com', port: 3306 });
    });
  });

  it('should throw on validation failure with namespace in message', () => {
    const strictFactory = createNamespacedConfig({
      key: 'strict-db',
      schema: z.object({ DB_HOST: z.string().min(1), DB_PORT: z.number() }),
      map: { host: 'DB_HOST', port: 'DB_PORT' },
    });

    delete process.env.DB_HOST;
    delete process.env.DB_PORT;

    expect(() => strictFactory()).toThrow(
      /Config validation failed for namespace "strict-db"/,
    );
  });
});
