import { Injectable } from '@nestjs/common';
import {
  AppException,
  COMMON_ERRORS,
  TransactionManager,
  withTransaction,
} from '@app/common';
import { UserRepository, USER_STATUS } from '@auth/users';
import { AuthMethodRepository } from '@auth/auth-methods';
import { TokenService, TokenPair, TokenMetadata } from '@auth/tokens';
import { AUTH_ERRORS } from '@auth/errors';
import { hashPassword, verifyPassword } from '../../utils/password.util';
import type {
  IAuthStrategy,
  AuthResult,
} from '../../interfaces/auth-strategy.interface';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, LoginSchema } from './dto/login.dto';

@Injectable()
export class LocalAuthService implements IAuthStrategy {
  readonly provider = 'local';

  constructor(
    private readonly userRepository: UserRepository,
    private readonly authMethodRepository: AuthMethodRepository,
    private readonly tokenService: TokenService,
    private readonly txManager: TransactionManager,
  ) {}

  async authenticate(credentials: unknown): Promise<AuthResult> {
    const { email, password } = LoginSchema.parse(credentials);
    const { user } = await this.validateCredentials(email, password);
    return { user: { id: user.id, email: user.email }, isNewUser: false };
  }

  async register(
    dto: RegisterDto,
    metadata?: TokenMetadata,
  ): Promise<TokenPair> {
    const passwordHash = await hashPassword(dto.password);

    const tx = await this.txManager.begin();
    try {
      const [userRepo, authMethodRepo] = withTransaction(
        tx.db,
        this.userRepository,
        this.authMethodRepository,
      );

      const existing = await userRepo.findByEmail(dto.email);
      if (existing) {
        throw new AppException(AUTH_ERRORS.EMAIL_TAKEN, {
          args: [dto.email],
        });
      }

      const user = await userRepo.create({
        email: dto.email,
        displayName: dto.displayName ?? dto.email.split('@')[0],
        emailVerified: false,
      });

      await authMethodRepo.create({
        userId: user.id,
        provider: this.provider,
        providerAccountId: dto.email,
        passwordHash,
      });

      await tx.commit();
      return this.tokenService.generateTokenPair(user.id, user.email, metadata);
    } catch (error) {
      await tx.rollback();
      if (error instanceof AppException) throw error;
      throw new AppException(COMMON_ERRORS.INTERNAL_SERVER_ERROR, {
        cause: error instanceof Error ? error : undefined,
        devMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async login(dto: LoginDto, metadata?: TokenMetadata): Promise<TokenPair> {
    const { user } = await this.validateCredentials(dto.email, dto.password);
    return this.tokenService.generateTokenPair(user.id, user.email, metadata);
  }

  private async validateCredentials(
    email: string,
    password: string,
  ): Promise<{ user: { id: string; email: string; status: string } }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      await hashPassword('dummy');
      throw new AppException(AUTH_ERRORS.INVALID_CREDENTIALS);
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw new AppException(AUTH_ERRORS.ACCOUNT_SUSPENDED);
    }

    const authMethod = await this.authMethodRepository.findByUserAndProvider(
      user.id,
      this.provider,
    );
    if (!authMethod?.passwordHash) {
      await hashPassword('dummy');
      throw new AppException(AUTH_ERRORS.INVALID_CREDENTIALS);
    }

    const valid = await verifyPassword(authMethod.passwordHash, password);
    if (!valid) {
      throw new AppException(AUTH_ERRORS.INVALID_CREDENTIALS);
    }

    return { user };
  }
}
