import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import {
  ResponseInterceptor,
  SuccessResponseBody,
} from './response.interceptor';

function createMockHttpContext(reqId?: string): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({ id: reqId }),
    }),
  } as unknown as ExecutionContext;
}

function createMockRpcContext(
  metadata?: Record<string, string[]>,
): ExecutionContext {
  return {
    getType: () => 'rpc',
    switchToRpc: () => ({
      getContext: () => ({
        metadata: metadata
          ? { get: (key: string) => metadata[key] ?? [] }
          : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

function createMockGraphqlContext(): ExecutionContext {
  return {
    getType: () => 'graphql',
  } as unknown as ExecutionContext;
}

function createMockCallHandler<T>(data: T): CallHandler<T> {
  return { handle: () => of(data) };
}

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  describe('HTTP transport', () => {
    it('should wrap response data in success envelope', (done) => {
      const context = createMockHttpContext('req-1');
      const next = createMockCallHandler({ id: 1, name: 'test' });

      interceptor.intercept(context, next).subscribe((result) => {
        const body = result as SuccessResponseBody<unknown>;
        expect(body.success).toBe(true);
        expect(body.data).toEqual({ id: 1, name: 'test' });
        expect(body.traceId).toBe('req-1');
        expect(body.timestamp).toBeDefined();
        done();
      });
    });

    it('should handle null data', (done) => {
      const context = createMockHttpContext('req-2');
      const next = createMockCallHandler(null);

      interceptor.intercept(context, next).subscribe((result) => {
        const body = result as SuccessResponseBody<unknown>;
        expect(body.success).toBe(true);
        expect(body.data).toBeNull();
        done();
      });
    });

    it('should use "unknown" when request has no id', (done) => {
      const context = createMockHttpContext();
      const next = createMockCallHandler('hello');

      interceptor.intercept(context, next).subscribe((result) => {
        expect((result as SuccessResponseBody<unknown>).traceId).toBe(
          'unknown',
        );
        done();
      });
    });
  });

  describe('RPC transport', () => {
    it('should wrap response in success envelope', (done) => {
      const context = createMockRpcContext();
      const next = createMockCallHandler({ userId: 1 });

      interceptor.intercept(context, next).subscribe((result) => {
        const body = result as SuccessResponseBody<unknown>;
        expect(body.success).toBe(true);
        expect(body.data).toEqual({ userId: 1 });
        expect(body.traceId).toBe('unknown');
        expect(body.timestamp).toBeDefined();
        done();
      });
    });

    it('should extract traceId from gRPC metadata', (done) => {
      const context = createMockRpcContext({
        'x-request-id': ['rpc-trace-123'],
      });
      const next = createMockCallHandler({ ok: true });

      interceptor.intercept(context, next).subscribe((result) => {
        expect((result as SuccessResponseBody<unknown>).traceId).toBe(
          'rpc-trace-123',
        );
        done();
      });
    });
  });

  describe('GraphQL transport', () => {
    it('should pass through data without wrapping', (done) => {
      const context = createMockGraphqlContext();
      const data = { user: { id: 1, name: 'test' } };
      const next = createMockCallHandler(data);

      interceptor.intercept(context, next).subscribe((result) => {
        expect(result).toEqual(data);
        expect(result).not.toHaveProperty('success');
        done();
      });
    });
  });
});
