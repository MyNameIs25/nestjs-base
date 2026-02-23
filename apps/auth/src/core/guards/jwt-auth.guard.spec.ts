import { ExecutionContext } from '@nestjs/common';
import { AppException } from '@app/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { TokenService } from '@auth/tokens';
import { AUTH_ERRORS } from '@auth/errors';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let verifyAccessToken: jest.Mock;

  const mockPayload = {
    sub: 'user-1',
    email: 'test@example.com',
  };

  function createHttpContext(authHeader?: string) {
    const request: Record<string, unknown> = {
      headers: { authorization: authHeader },
    };
    return {
      context: {
        getType: () => 'http',
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext,
      request,
    };
  }

  function createRpcContext(authValue?: string) {
    const metadata = {
      get: jest.fn((key: string) => {
        if (key === 'authorization' && authValue !== undefined) {
          return [authValue];
        }
        return [];
      }),
      set: jest.fn(),
    };
    return {
      context: {
        getType: () => 'rpc',
        switchToRpc: () => ({
          getContext: () => ({ metadata }),
        }),
      } as unknown as ExecutionContext,
      metadata,
    };
  }

  function createGraphqlContext(authHeader?: string) {
    const request: Record<string, unknown> = {
      headers: { authorization: authHeader },
    };
    return {
      context: {
        getType: () => 'graphql',
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext,
      request,
    };
  }

  beforeEach(() => {
    verifyAccessToken = jest.fn().mockReturnValue(mockPayload);

    guard = new JwtAuthGuard({
      verifyAccessToken,
    } as unknown as TokenService);
  });

  describe('HTTP transport', () => {
    it('should allow request with valid token', () => {
      const { context } = createHttpContext('Bearer valid-token');
      expect(guard.canActivate(context)).toBe(true);
      expect(verifyAccessToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw INVALID_CREDENTIALS when no Authorization header', () => {
      const { context } = createHttpContext();

      expect.assertions(2);
      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        expect(error).toHaveProperty(
          'errorCode',
          AUTH_ERRORS.INVALID_CREDENTIALS,
        );
      }
    });

    it('should throw INVALID_CREDENTIALS when header is not Bearer', () => {
      const { context } = createHttpContext('Basic abc123');

      expect.assertions(2);
      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        expect(error).toHaveProperty(
          'errorCode',
          AUTH_ERRORS.INVALID_CREDENTIALS,
        );
      }
    });

    it('should throw TOKEN_EXPIRED when token is expired', () => {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      verifyAccessToken.mockImplementation(() => {
        throw expiredError;
      });

      const { context } = createHttpContext('Bearer expired-token');

      expect.assertions(2);
      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        expect(error).toHaveProperty('errorCode', AUTH_ERRORS.TOKEN_EXPIRED);
      }
    });

    it('should throw INVALID_CREDENTIALS when token is malformed', () => {
      verifyAccessToken.mockImplementation(() => {
        throw new Error('invalid token');
      });

      const { context } = createHttpContext('Bearer malformed-token');

      expect.assertions(2);
      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        expect(error).toHaveProperty(
          'errorCode',
          AUTH_ERRORS.INVALID_CREDENTIALS,
        );
      }
    });

    it('should attach decoded payload to request.user', () => {
      const { context, request } = createHttpContext('Bearer valid-token');

      guard.canActivate(context);

      expect(request['user']).toEqual(mockPayload);
    });
  });

  describe('RPC (gRPC) transport', () => {
    it('should allow request with valid token in metadata', () => {
      const { context, metadata } = createRpcContext('Bearer valid-token');

      expect(guard.canActivate(context)).toBe(true);
      expect(verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(metadata.set).toHaveBeenCalledWith(
        'user',
        JSON.stringify(mockPayload),
      );
    });

    it('should allow request with token without Bearer prefix', () => {
      const { context } = createRpcContext('raw-token');

      expect(guard.canActivate(context)).toBe(true);
      expect(verifyAccessToken).toHaveBeenCalledWith('raw-token');
    });

    it('should throw INVALID_CREDENTIALS when no authorization in metadata', () => {
      const { context } = createRpcContext();

      expect.assertions(2);
      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        expect(error).toHaveProperty(
          'errorCode',
          AUTH_ERRORS.INVALID_CREDENTIALS,
        );
      }
    });

    it('should throw TOKEN_EXPIRED when token is expired', () => {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';
      verifyAccessToken.mockImplementation(() => {
        throw expiredError;
      });

      const { context } = createRpcContext('Bearer expired-token');

      expect.assertions(2);
      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        expect(error).toHaveProperty('errorCode', AUTH_ERRORS.TOKEN_EXPIRED);
      }
    });
  });

  describe('GraphQL transport', () => {
    it('should allow request with valid token (uses HTTP request)', () => {
      const { context, request } = createGraphqlContext('Bearer valid-token');

      expect(guard.canActivate(context)).toBe(true);
      expect(verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(request['user']).toEqual(mockPayload);
    });

    it('should throw INVALID_CREDENTIALS when no Authorization header', () => {
      const { context } = createGraphqlContext();

      expect.assertions(2);
      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(AppException);
        expect(error).toHaveProperty(
          'errorCode',
          AUTH_ERRORS.INVALID_CREDENTIALS,
        );
      }
    });
  });
});
