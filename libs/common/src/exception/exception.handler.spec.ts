import { HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { GraphQLError } from 'graphql';
import { ExceptionHandler } from './exception.handler';
import { COMMON_ERRORS } from './exception.constants';
import { AppException } from './exceptions/base.exception';
import { AppLogger } from '../logger/logger.service';

interface MockLogger extends AppLogger {
  log: jest.Mock;
  error: jest.Mock;
  warn: jest.Mock;
  debug: jest.Mock;
  verbose: jest.Mock;
  fatal: jest.Mock;
}

function createMockLogger(): MockLogger {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    fatal: jest.fn(),
  } as unknown as MockLogger;
}

describe('ExceptionHandler', () => {
  let handler: ExceptionHandler;
  let logger: MockLogger;

  beforeEach(() => {
    logger = createMockLogger();
    handler = new ExceptionHandler(logger);
  });

  describe('resolve', () => {
    it('should resolve AppException with user error code', () => {
      const ex = new AppException(COMMON_ERRORS.NOT_FOUND);
      const result = handler.resolve(ex);

      expect(result.errorCode).toBe(COMMON_ERRORS.NOT_FOUND);
      expect(result.message).toBe('Not found');
      expect(result.status).toBe(404);
      expect(result.devMessage).toBeUndefined();
    });

    it('should resolve AppException with interpolated message', () => {
      const errorCode = {
        code: 'A01001',
        httpStatus: 409,
        message: 'Username "%s" already exists',
      };
      const ex = new AppException(errorCode, { args: ['john'] });
      const result = handler.resolve(ex);

      expect(result.message).toBe('Username "john" already exists');
    });

    it('should include stack as devMessage for system errors', () => {
      const ex = new AppException(COMMON_ERRORS.INTERNAL_SERVER_ERROR);
      const result = handler.resolve(ex);

      expect(result.devMessage).toBeDefined();
      expect(result.devMessage).toContain('AppException');
    });

    it('should use explicit devMessage over stack', () => {
      const ex = new AppException(COMMON_ERRORS.INTERNAL_SERVER_ERROR, {
        devMessage: 'pool exhausted',
      });
      const result = handler.resolve(ex);

      expect(result.devMessage).toBe('pool exhausted');
    });

    it('should resolve HttpException via HTTP_STATUS_TO_ERROR mapping', () => {
      const ex = new HttpException('Not Found', 404);
      const result = handler.resolve(ex);

      expect(result.errorCode.code).toBe('A00004');
      expect(result.status).toBe(404);
    });

    it('should fallback unmapped HttpException to INTERNAL_SERVER_ERROR', () => {
      const ex = new HttpException('Teapot', 418);
      const result = handler.resolve(ex);

      expect(result.errorCode.code).toBe('B00001');
      expect(result.status).toBe(418);
    });

    it('should resolve unknown errors as INTERNAL_SERVER_ERROR', () => {
      const result = handler.resolve(new Error('something broke'));

      expect(result.errorCode.code).toBe('B00001');
      expect(result.message).toBe('Internal server error');
      expect(result.status).toBe(500);
    });

    it('should handle non-Error throws', () => {
      const result = handler.resolve('string error');

      expect(result.errorCode.code).toBe('B00001');
      expect(result.status).toBe(500);
    });

    it('should resolve RpcException with string error', () => {
      const ex = new RpcException('Service unavailable');
      const result = handler.resolve(ex);

      expect(result.errorCode.code).toBe('B00001');
      expect(result.message).toBe('Internal server error');
      expect(result.devMessage).toBe('Service unavailable');
      expect(result.status).toBe(500);
    });

    it('should resolve RpcException with object error', () => {
      const ex = new RpcException({ reason: 'timeout', code: 14 });
      const result = handler.resolve(ex);

      expect(result.errorCode.code).toBe('B00001');
      expect(result.devMessage).toContain('timeout');
      expect(result.status).toBe(500);
    });

    it('should resolve GraphQLError as BAD_REQUEST', () => {
      const ex = new GraphQLError('Cannot query field "foo" on type "Query"');
      const result = handler.resolve(ex);

      expect(result.errorCode.code).toBe('A00001');
      expect(result.message).toBe('Cannot query field "foo" on type "Query"');
      expect(result.status).toBe(400);
    });

    it('should include GraphQLError extensions as devMessage', () => {
      const ex = new GraphQLError('Validation failed', {
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED', field: 'email' },
      });
      const result = handler.resolve(ex);

      expect(result.devMessage).toContain('GRAPHQL_VALIDATION_FAILED');
      expect(result.devMessage).toContain('email');
    });
  });

  describe('log', () => {
    it('should log user errors (source A) at warn level', () => {
      const ex = new AppException(COMMON_ERRORS.NOT_FOUND);
      handler.log(ex, COMMON_ERRORS.NOT_FOUND, 'req-1');

      expect(logger.warn).toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log system errors (source B) at error level', () => {
      const ex = new AppException(COMMON_ERRORS.INTERNAL_SERVER_ERROR);
      handler.log(ex, COMMON_ERRORS.INTERNAL_SERVER_ERROR, 'req-2');

      expect(logger.error).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should log third-party errors (source C) at error level', () => {
      const ex = new AppException(COMMON_ERRORS.THIRD_PARTY_ERROR);
      handler.log(ex, COMMON_ERRORS.THIRD_PARTY_ERROR, 'req-3');

      expect(logger.error).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should log unknown errors at error level', () => {
      handler.log(
        new Error('crash'),
        COMMON_ERRORS.INTERNAL_SERVER_ERROR,
        'req-4',
      );

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
