import { Injectable } from '@nestjs/common';
import { and, eq, gt, lt } from 'drizzle-orm';
import { BaseRepository, InjectDrizzle, DrizzleDB } from '@app/common';
import { refreshTokens } from './schemas/refresh-token.schema';

@Injectable()
export class TokenRepository extends BaseRepository<typeof refreshTokens> {
  constructor(@InjectDrizzle() db: DrizzleDB) {
    super(db, refreshTokens, refreshTokens.id);
  }

  async findValidByHash(tokenHash: string) {
    return this.findOne(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.revoked, false),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    );
  }

  async findByHash(tokenHash: string) {
    return this.findOne(eq(refreshTokens.tokenHash, tokenHash));
  }

  async findByHashForUpdate(tokenHash: string) {
    const rows = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1)
      .for('update');
    return rows[0];
  }

  async revokeByHash(tokenHash: string) {
    return this.update(eq(refreshTokens.tokenHash, tokenHash), {
      revoked: true,
    });
  }

  async revokeAllForUser(userId: string) {
    return this.update(
      and(eq(refreshTokens.userId, userId), eq(refreshTokens.revoked, false)),
      { revoked: true },
    );
  }

  async deleteExpired() {
    return this.delete(lt(refreshTokens.expiresAt, new Date()));
  }
}
