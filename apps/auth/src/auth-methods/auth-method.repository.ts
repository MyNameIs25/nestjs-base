import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { BaseRepository, InjectDrizzle, DrizzleDB } from '@app/common';
import { userAuthMethods } from './schemas/user-auth-method.schema';

@Injectable()
export class AuthMethodRepository extends BaseRepository<
  typeof userAuthMethods
> {
  constructor(@InjectDrizzle() db: DrizzleDB) {
    super(db, userAuthMethods, userAuthMethods.id);
  }

  async findByProvider(provider: string, providerAccountId: string) {
    return this.findOne(
      and(
        eq(userAuthMethods.provider, provider),
        eq(userAuthMethods.providerAccountId, providerAccountId),
      ),
    );
  }

  async findByUserId(userId: string) {
    const rows = await this.db
      .select()
      .from(userAuthMethods)
      .where(eq(userAuthMethods.userId, userId));
    return rows;
  }

  async findByUserAndProvider(userId: string, provider: string) {
    return this.findOne(
      and(
        eq(userAuthMethods.userId, userId),
        eq(userAuthMethods.provider, provider),
      ),
    );
  }
}
