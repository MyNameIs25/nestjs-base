import { Test, TestingModule } from '@nestjs/testing';
import { COMMON_ERRORS, TransactionManager } from '@app/common';
import { LocalAuthService } from './local-auth.service';
import { UserRepository } from '@auth/users';
import { AuthMethodRepository } from '@auth/auth-methods';
import { TokenService } from '@auth/tokens';
import { AUTH_ERRORS } from '@auth/errors';
import { hashPassword } from '../../utils/password.util';

const mockTokenPair = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

describe('LocalAuthService', () => {
  let service: LocalAuthService;
  let mockFindByEmail: jest.Mock;
  let mockCreateUser: jest.Mock;
  let mockFindByUserAndProvider: jest.Mock;
  let mockCreateAuthMethod: jest.Mock;
  let mockGenerateTokenPair: jest.Mock;
  let mockTxBegin: jest.Mock;
  let mockTxCommit: jest.Mock;
  let mockTxRollback: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockFindByEmail = jest.fn();
    mockCreateUser = jest.fn();
    mockFindByUserAndProvider = jest.fn();
    mockCreateAuthMethod = jest.fn();
    mockGenerateTokenPair = jest.fn().mockResolvedValue(mockTokenPair);
    mockTxCommit = jest.fn();
    mockTxRollback = jest.fn();
    mockTxBegin = jest.fn().mockResolvedValue({
      db: 'mock-tx',
      commit: mockTxCommit,
      rollback: mockTxRollback,
    });

    const mockUserRepo = {
      findByEmail: mockFindByEmail,
      create: mockCreateUser,
      withTransaction: jest.fn().mockReturnThis(),
    };
    mockUserRepo.withTransaction.mockReturnValue(mockUserRepo);

    const mockAuthMethodRepo = {
      findByUserAndProvider: mockFindByUserAndProvider,
      create: mockCreateAuthMethod,
      withTransaction: jest.fn().mockReturnThis(),
    };
    mockAuthMethodRepo.withTransaction.mockReturnValue(mockAuthMethodRepo);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalAuthService,
        {
          provide: UserRepository,
          useValue: mockUserRepo,
        },
        {
          provide: AuthMethodRepository,
          useValue: mockAuthMethodRepo,
        },
        {
          provide: TokenService,
          useValue: {
            generateTokenPair: mockGenerateTokenPair,
          },
        },
        {
          provide: TransactionManager,
          useValue: { begin: mockTxBegin },
        },
      ],
    }).compile();

    service = module.get(LocalAuthService);
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      mockFindByEmail.mockResolvedValue(undefined);
      mockCreateUser.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test',
        emailVerified: false,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockCreateAuthMethod.mockResolvedValue({
        id: 'method-1',
        userId: 'user-1',
        provider: 'local',
        providerAccountId: 'test@example.com',
        passwordHash: 'hashed',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test',
      });

      expect(result).toEqual(mockTokenPair);
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          displayName: 'Test',
          emailVerified: false,
        }),
      );
      expect(mockCreateAuthMethod).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          provider: 'local',
          providerAccountId: 'test@example.com',
        }),
      );
      const authMethodCalls = mockCreateAuthMethod.mock.calls as unknown[][];
      const authMethodArg = authMethodCalls[0][0] as Record<string, unknown>;
      expect(typeof authMethodArg.passwordHash).toBe('string');
      expect(mockGenerateTokenPair).toHaveBeenCalledWith(
        'user-1',
        'test@example.com',
        undefined,
      );
    });

    it('should throw EMAIL_TAKEN when email exists', async () => {
      mockFindByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test',
        emailVerified: false,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toMatchObject({
        errorCode: AUTH_ERRORS.EMAIL_TAKEN,
      });
    });

    it('should rollback and wrap raw errors as INTERNAL_SERVER_ERROR', async () => {
      mockFindByEmail.mockResolvedValue(undefined);
      mockCreateUser.mockRejectedValue(new Error('db error'));

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toMatchObject({
        errorCode: COMMON_ERRORS.INTERNAL_SERVER_ERROR,
      });

      expect(mockTxRollback).toHaveBeenCalled();
      expect(mockTxCommit).not.toHaveBeenCalled();
    });

    it('should commit transaction on success', async () => {
      mockFindByEmail.mockResolvedValue(undefined);
      mockCreateUser.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test',
        emailVerified: false,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockCreateAuthMethod.mockResolvedValue({ id: 'method-1' });

      await service.register({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockTxCommit).toHaveBeenCalled();
      expect(mockTxRollback).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const testPassword = 'password123';
    let testPasswordHash: string;

    beforeAll(async () => {
      testPasswordHash = await hashPassword(testPassword);
    });

    it('should login and return tokens for valid credentials', async () => {
      mockFindByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test',
        emailVerified: false,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockFindByUserAndProvider.mockResolvedValue({
        id: 'method-1',
        userId: 'user-1',
        provider: 'local',
        providerAccountId: 'test@example.com',
        passwordHash: testPasswordHash,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.login({
        email: 'test@example.com',
        password: testPassword,
      });

      expect(result).toEqual(mockTokenPair);
      expect(mockGenerateTokenPair).toHaveBeenCalledWith(
        'user-1',
        'test@example.com',
        undefined,
      );
    });

    it('should throw INVALID_CREDENTIALS when user not found', async () => {
      mockFindByEmail.mockResolvedValue(undefined);

      await expect(
        service.login({
          email: 'test@example.com',
          password: testPassword,
        }),
      ).rejects.toMatchObject({
        errorCode: AUTH_ERRORS.INVALID_CREDENTIALS,
      });
    });

    it('should throw INVALID_CREDENTIALS when password is wrong', async () => {
      mockFindByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test',
        emailVerified: false,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockFindByUserAndProvider.mockResolvedValue({
        id: 'method-1',
        userId: 'user-1',
        provider: 'local',
        providerAccountId: 'test@example.com',
        passwordHash: testPasswordHash,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toMatchObject({
        errorCode: AUTH_ERRORS.INVALID_CREDENTIALS,
      });
    });

    it('should throw ACCOUNT_SUSPENDED when user is not active', async () => {
      mockFindByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test',
        emailVerified: false,
        status: 'suspended',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: testPassword,
        }),
      ).rejects.toMatchObject({
        errorCode: AUTH_ERRORS.ACCOUNT_SUSPENDED,
      });
    });
  });
});
