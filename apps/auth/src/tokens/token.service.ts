import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import {
  AppException,
  COMMON_ERRORS,
  TransactionManager,
  withTransaction,
} from '@app/common';
import { AuthConfigService } from '../config';
import { TokenRepository } from './token.repository';
import { UserRepository } from '../users';
import { AUTH_ERRORS } from '../errors';
import { parseDuration } from './utils/duration.util';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TokenMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tokenRepository: TokenRepository,
    private readonly userRepository: UserRepository,
    private readonly config: AuthConfigService,
    private readonly txManager: TransactionManager,
  ) {}

  async generateTokenPair(
    userId: string,
    email: string,
    metadata?: TokenMetadata,
  ): Promise<TokenPair> {
    const accessToken = this.signAccessToken(userId, email);
    const { rawToken } = await this.createRefreshToken(
      userId,
      this.tokenRepository,
      metadata,
    );
    return { accessToken, refreshToken: rawToken };
  }

  async refreshTokens(
    rawRefreshToken: string,
    metadata?: TokenMetadata,
  ): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const tx = await this.txManager.begin();
    try {
      const [tokenRepo] = withTransaction(tx.db, this.tokenRepository);

      const existingToken = await tokenRepo.findByHashForUpdate(tokenHash);
      if (!existingToken) {
        throw new AppException(AUTH_ERRORS.INVALID_REFRESH_TOKEN);
      }

      if (existingToken.revoked) {
        await tx.rollback();
        await this.tokenRepository.revokeAllForUser(existingToken.userId);
        throw new AppException(AUTH_ERRORS.TOKEN_REUSE_DETECTED);
      }

      if (existingToken.expiresAt < new Date()) {
        throw new AppException(AUTH_ERRORS.INVALID_REFRESH_TOKEN);
      }

      const user = await this.userRepository.findById(existingToken.userId);
      if (!user) {
        throw new AppException(AUTH_ERRORS.INVALID_REFRESH_TOKEN);
      }

      await tokenRepo.revokeByHash(tokenHash);

      const { rawToken, tokenId } = await this.createRefreshToken(
        user.id,
        tokenRepo,
        metadata,
      );

      await tokenRepo.updateById(existingToken.id, {
        replacedByTokenId: tokenId,
      });

      await tx.commit();

      const accessToken = this.signAccessToken(user.id, user.email);
      return { accessToken, refreshToken: rawToken };
    } catch (error) {
      await tx.rollback();
      if (error instanceof AppException) throw error;
      throw new AppException(COMMON_ERRORS.INTERNAL_SERVER_ERROR, {
        cause: error instanceof Error ? error : undefined,
        devMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async revokeToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.tokenRepository.revokeByHash(tokenHash);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.tokenRepository.revokeAllForUser(userId);
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwtService.verify<AccessTokenPayload>(token, {
      secret: this.config.jwt.secret,
    });
  }

  private signAccessToken(userId: string, email: string): string {
    const payload: AccessTokenPayload = { sub: userId, email };
    return this.jwtService.sign(payload, {
      secret: this.config.jwt.secret,
      expiresIn: parseDuration(this.config.jwt.accessExpiry) / 1000,
    });
  }

  private async createRefreshToken(
    userId: string,
    tokenRepo: TokenRepository,
    metadata?: TokenMetadata,
  ): Promise<{ rawToken: string; tokenId: string }> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + parseDuration(this.config.jwt.refreshExpiry),
    );
    const record = await tokenRepo.create({
      userId,
      tokenHash,
      expiresAt,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    });
    return { rawToken, tokenId: record.id };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
