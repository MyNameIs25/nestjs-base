import { ArgumentsHost, HttpException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AppExceptionFilter } from './app-exception.filter';
import { ExceptionHandler } from '../exception.handler';
import { COMMON_ERRORS } from '../exception.constants';
import { AppException } from '../exceptions/base.exception';
import { AppLogger } from '../../logger/logger.service';

function createMockLogger() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    fatal: jest.fn(),
  } as unknown as AppLogger;
}

function createMockHttpHost(reqId?: string) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });

  const host = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({ id: reqId }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

function createMockRpcHost() {
  return {
    getType: () => 'rpc',
  } as unknown as ArgumentsHost;
}

function createMockGraphqlHost(reqId?: string) {
  return {
    getType: () => 'graphql',
    switchToHttp: () => ({
      getRequest: () => ({ id: reqId }),
    }),
  } as unknown as ArgumentsHost;
}

describe('AppExceptionFilter', () => {
  let filter: AppExceptionFilter;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    const handler = new ExceptionHandler(createMockLogger());
    filter = new AppExceptionFilter(handler);
  });

  describe('HTTP transport', () => {
    it('should respond with correct status and JSON body', () => {
      const { host, status, json } = createMockHttpHost('req-1');
      const ex = new AppException(COMMON_ERRORS.NOT_FOUND);

      filter.catch(ex, host);

      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'A00004',
          message: 'Not found',
          traceId: 'req-1',
        }),
      );
    });

    it('should include devMessage in non-production', () => {
      const { host, json } = createMockHttpHost('req-2');
      const ex = new AppException(COMMON_ERRORS.BAD_REQUEST, {
        devMessage: 'missing field: email',
      });

      filter.catch(ex, host);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          devMessage: 'missing field: email',
        }),
      );
    });

    it('should include timestamp in response', () => {
      const { host, json } = createMockHttpHost('req-3');
      filter.catch(new Error('test'), host);

      const body = (json.mock.calls[0] as [Record<string, unknown>])[0];
      expect(body.timestamp).toBeDefined();
    });

    it('should use "unknown" when request has no id', () => {
      const { host, json } = createMockHttpHost();
      filter.catch(new Error('test'), host);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ traceId: 'unknown' }),
      );
    });
  });

  describe('RPC transport', () => {
    it('should return Observable with error payload', (done) => {
      const host = createMockRpcHost();
      const ex = new AppException(COMMON_ERRORS.NOT_FOUND);

      const result = filter.catch(ex, host) as Observable<never>;

      result.subscribe({
        error: (err: Record<string, unknown>) => {
          expect(err).toEqual(
            expect.objectContaining({
              code: 'A00004',
              message: 'Not found',
              status: 404,
            }),
          );
          done();
        },
      });
    });

    it('should include devMessage in non-production', (done) => {
      const host = createMockRpcHost();
      const ex = new AppException(COMMON_ERRORS.INTERNAL_SERVER_ERROR, {
        devMessage: 'pool exhausted',
      });

      const result = filter.catch(ex, host) as Observable<never>;

      result.subscribe({
        error: (err: Record<string, unknown>) => {
          expect(err).toEqual(
            expect.objectContaining({
              devMessage: 'pool exhausted',
            }),
          );
          done();
        },
      });
    });
  });

  describe('GraphQL transport', () => {
    it('should throw HttpException with error extensions', () => {
      const host = createMockGraphqlHost('req-gql');
      const ex = new AppException(COMMON_ERRORS.NOT_FOUND);

      expect(() => filter.catch(ex, host)).toThrow(HttpException);

      try {
        filter.catch(ex, host);
      } catch (thrown) {
        expect(thrown).toBeInstanceOf(HttpException);
        const httpEx = thrown as HttpException;
        expect(httpEx.getStatus()).toBe(404);

        const response = httpEx.getResponse() as Record<string, unknown>;
        expect(response.code).toBe('A00004');
        expect(response.message).toBe('Not found');
      }
    });

    it('should include devMessage in non-production', () => {
      const host = createMockGraphqlHost('req-gql-2');
      const ex = new AppException(COMMON_ERRORS.BAD_REQUEST, {
        devMessage: 'invalid input',
      });

      try {
        filter.catch(ex, host);
      } catch (thrown) {
        const response = (thrown as HttpException).getResponse() as Record<
          string,
          unknown
        >;
        expect(response.devMessage).toBe('invalid input');
      }
    });

    it('should fallback traceId when switchToHttp fails', () => {
      const host = {
        getType: () => 'graphql',
        switchToHttp: () => {
          throw new Error('no http context');
        },
      } as unknown as ArgumentsHost;

      expect(() =>
        filter.catch(new AppException(COMMON_ERRORS.NOT_FOUND), host),
      ).toThrow(HttpException);
    });
  });
});
