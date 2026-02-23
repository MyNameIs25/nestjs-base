import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import type { AccessTokenPayload } from '@auth/tokens';
import { CurrentUser } from './current-user.decorator';

function getParamDecoratorFactory(
  decorator: () => ParameterDecorator,
): (data: unknown, ctx: ExecutionContext) => AccessTokenPayload {
  class TestController {
    test(@decorator() value: unknown) {
      return value;
    }
  }

  type FactoryRecord = Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => AccessTokenPayload }
  >;

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestController,
    'test',
  ) as FactoryRecord;

  const key = Object.keys(metadata)[0];
  return metadata[key].factory;
}

describe('CurrentUser decorator', () => {
  const mockPayload: AccessTokenPayload = {
    sub: 'user-1',
    email: 'test@example.com',
  };

  const factory = getParamDecoratorFactory(CurrentUser);

  function createHttpContext(): ExecutionContext {
    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ user: mockPayload }),
      }),
    } as unknown as ExecutionContext;
  }

  function createRpcContext(
    userPayload?: AccessTokenPayload,
  ): ExecutionContext {
    const metadata = {
      get: jest.fn((key: string) => {
        if (key === 'user' && userPayload) {
          return [JSON.stringify(userPayload)];
        }
        return [];
      }),
    };
    return {
      getType: () => 'rpc',
      switchToRpc: () => ({
        getContext: () => ({ metadata }),
      }),
    } as unknown as ExecutionContext;
  }

  function createGraphqlContext(): ExecutionContext {
    return {
      getType: () => 'graphql',
      switchToHttp: () => ({
        getRequest: () => ({ user: mockPayload }),
      }),
    } as unknown as ExecutionContext;
  }

  describe('HTTP transport', () => {
    it('should extract user from request.user', () => {
      const ctx = createHttpContext();
      const result = factory(undefined, ctx);
      expect(result).toEqual(mockPayload);
    });
  });

  describe('RPC (gRPC) transport', () => {
    it('should extract and parse user from metadata', () => {
      const ctx = createRpcContext(mockPayload);
      const result = factory(undefined, ctx);
      expect(result).toEqual(mockPayload);
    });
  });

  describe('GraphQL transport', () => {
    it('should extract user from HTTP request (same as HTTP)', () => {
      const ctx = createGraphqlContext();
      const result = factory(undefined, ctx);
      expect(result).toEqual(mockPayload);
    });
  });
});
