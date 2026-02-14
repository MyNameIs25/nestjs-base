import { Test, TestingModule } from '@nestjs/testing';
import { Logger as PinoNestLogger } from 'nestjs-pino';
import { AppLogger } from './logger.service';

describe('AppLogger', () => {
  let appLogger: AppLogger;
  let pinoLogger: Record<string, jest.Mock>;

  beforeEach(async () => {
    pinoLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      fatal: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AppLogger, { provide: PinoNestLogger, useValue: pinoLogger }],
    }).compile();

    appLogger = module.get(AppLogger);
  });

  it('should be defined', () => {
    expect(appLogger).toBeDefined();
  });

  it.each(['log', 'error', 'warn', 'debug', 'verbose', 'fatal'] as const)(
    'should delegate %s() to PinoNestLogger',
    (method) => {
      appLogger[method]('test message', 'TestContext');

      expect(pinoLogger[method]).toHaveBeenCalledWith(
        'test message',
        'TestContext',
      );
    },
  );

  it('should pass multiple params to the underlying logger', () => {
    appLogger.error('something failed', 'stack-trace', 'TestContext');

    expect(pinoLogger.error).toHaveBeenCalledWith(
      'something failed',
      'stack-trace',
      'TestContext',
    );
  });
});
