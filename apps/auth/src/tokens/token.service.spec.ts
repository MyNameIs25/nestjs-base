import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TransactionManager } from '@app/common';
import { TokenService } from './token.service';
import { TokenRepository } from './token.repository';
import { UserRepository } from '../users';
import { AuthConfigService } from '../config';
import { AUTH_ERRORS } from '../errors';

describe('TokenService', () => {
  let service: TokenService;
  let mockJwtSign: jest.Mock;
  let mockJwtVerify: jest.Mock;
  let mockTokenRepoCreate: jest.Mock;
  let mockTokenRepoFindByHash: jest.Mock;
  let mockTokenRepoFindByHashForUpdate: jest.Mock;
  let mockTokenRepoRevokeByHash: jest.Mock;
  let mockTokenRepoRevokeAllForUser: jest.Mock;
  let mockTokenRepoUpdateById: jest.Mock;
  let mockUserRepoFindById: jest.Mock;
  let mockTxBegin: jest.Mock;
  let mockTxCommit: jest.Mock;
  let mockTxRollback: jest.Mock;

  beforeEach(async () => {
    mockJwtSign = jest.fn().mockReturnValue('mock-access-token');
    mockJwtVerify = jest.fn().mockReturnValue({
      sub: 'user-1',
      email: 'test@example.com',
    });
    mockTokenRepoCreate = jest.fn().mockResolvedValue({ id: 'token-1' });
    mockTokenRepoFindByHash = jest.fn();
    mockTokenRepoFindByHashForUpdate = jest.fn();
    mockTokenRepoRevokeByHash = jest.fn().mockResolvedValue([]);
    mockTokenRepoRevokeAllForUser = jest.fn().mockResolvedValue([]);
    mockTokenRepoUpdateById = jest.fn().mockResolvedValue({});
    mockUserRepoFindById = jest.fn();
    mockTxCommit = jest.fn();
    mockTxRollback = jest.fn();
    mockTxBegin = jest.fn().mockResolvedValue({
      db: 'mock-tx',
      commit: mockTxCommit,
      rollback: mockTxRollback,
    });

    const mockTokenRepo = {
      create: mockTokenRepoCreate,
      findByHash: mockTokenRepoFindByHash,
      findByHashForUpdate: mockTokenRepoFindByHashForUpdate,
      revokeByHash: mockTokenRepoRevokeByHash,
      revokeAllForUser: mockTokenRepoRevokeAllForUser,
      updateById: mockTokenRepoUpdateById,
      withTransaction: jest.fn().mockReturnThis(),
    };
    mockTokenRepo.withTransaction.mockReturnValue(mockTokenRepo);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: { sign: mockJwtSign, verify: mockJwtVerify },
        },
        {
          provide: TokenRepository,
          useValue: mockTokenRepo,
        },
        {
          provide: UserRepository,
          useValue: { findById: mockUserRepoFindById },
        },
        {
          provide: AuthConfigService,
          useValue: {
            jwt: {
              secret: 'test-secret-key-that-is-at-least-32-chars',
              accessExpiry: '15m',
              refreshExpiry: '7d',
            },
          },
        },
        {
          provide: TransactionManager,
          useValue: { begin: mockTxBegin },
        },
      ],
    }).compile();

    service = module.get(TokenService);
  });

  describe('generateTokenPair', () => {
    it('should return access and refresh tokens', async () => {
      const result = await service.generateTokenPair(
        'user-1',
        'test@example.com',
      );

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).toHaveLength(64);
      expect(mockJwtSign).toHaveBeenCalled();
      expect(mockTokenRepoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          tokenHash: expect.any(String) as string,
          expiresAt: expect.any(Date) as Date,
        }),
      );
    });

    it('should pass metadata to token record', async () => {
      await service.generateTokenPair('user-1', 'test@example.com', {
        userAgent: 'Mozilla/5.0',
        ipAddress: '127.0.0.1',
      });

      expect(mockTokenRepoCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: 'Mozilla/5.0',
          ipAddress: '127.0.0.1',
        }),
      );
    });
  });

  describe('refreshTokens', () => {
    it('should throw INVALID_REFRESH_TOKEN when token not found', async () => {
      mockTokenRepoFindByHashForUpdate.mockResolvedValue(undefined);

      await expect(
        service.refreshTokens('invalid-token'),
      ).rejects.toMatchObject({
        errorCode: AUTH_ERRORS.INVALID_REFRESH_TOKEN,
      });
      expect(mockTxBegin).toHaveBeenCalled();
      expect(mockTxRollback).toHaveBeenCalled();
    });

    it('should revoke all tokens and throw TOKEN_REUSE_DETECTED when token is revoked', async () => {
      mockTokenRepoFindByHashForUpdate.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hash',
        revoked: true,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        replacedByTokenId: null,
        userAgent: null,
        ipAddress: null,
      });

      await expect(service.refreshTokens('reused-token')).rejects.toMatchObject(
        {
          errorCode: AUTH_ERRORS.TOKEN_REUSE_DETECTED,
        },
      );
      expect(mockTokenRepoRevokeAllForUser).toHaveBeenCalledWith('user-1');
      expect(mockTxRollback).toHaveBeenCalled();
    });

    it('should throw INVALID_REFRESH_TOKEN when token is expired', async () => {
      mockTokenRepoFindByHashForUpdate.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hash',
        revoked: false,
        expiresAt: new Date(Date.now() - 1000),
        createdAt: new Date(),
        replacedByTokenId: null,
        userAgent: null,
        ipAddress: null,
      });

      await expect(
        service.refreshTokens('expired-token'),
      ).rejects.toMatchObject({
        errorCode: AUTH_ERRORS.INVALID_REFRESH_TOKEN,
      });
      expect(mockTxRollback).toHaveBeenCalled();
    });

    it('should generate new token pair on valid refresh', async () => {
      mockTokenRepoFindByHashForUpdate.mockResolvedValueOnce({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'old-hash',
        revoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        replacedByTokenId: null,
        userAgent: null,
        ipAddress: null,
      });

      mockUserRepoFindById.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test',
        emailVerified: false,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockTokenRepoCreate.mockResolvedValue({ id: 'token-2' });

      const result = await service.refreshTokens('valid-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(mockTokenRepoFindByHashForUpdate).toHaveBeenCalled();
      expect(mockTokenRepoRevokeByHash).toHaveBeenCalled();
      expect(mockTokenRepoCreate).toHaveBeenCalled();
      expect(mockTokenRepoUpdateById).toHaveBeenCalledWith('token-1', {
        replacedByTokenId: 'token-2',
      });
      expect(mockTxBegin).toHaveBeenCalled();
      expect(mockTxCommit).toHaveBeenCalled();
      expect(mockTxRollback).not.toHaveBeenCalled();
    });
  });

  describe('revokeToken', () => {
    it('should revoke token by hash', async () => {
      await service.revokeToken('some-token');
      expect(mockTokenRepoRevokeByHash).toHaveBeenCalled();
    });
  });

  describe('verifyAccessToken', () => {
    it('should return decoded payload', () => {
      const result = service.verifyAccessToken('some-jwt');

      expect(result).toEqual({
        sub: 'user-1',
        email: 'test@example.com',
      });
      expect(mockJwtVerify).toHaveBeenCalledWith('some-jwt', {
        secret: 'test-secret-key-that-is-at-least-32-chars',
      });
    });
  });
});
