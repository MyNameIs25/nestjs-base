import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { BaseRepository, InjectDrizzle, DrizzleDB } from '@app/common';
import { users } from './schemas/user.schema';

@Injectable()
export class UserRepository extends BaseRepository<typeof users> {
  constructor(@InjectDrizzle() db: DrizzleDB) {
    super(db, users, users.id);
  }

  async findByEmail(email: string) {
    return this.findOne(and(eq(users.email, email), isNull(users.deletedAt)));
  }
}
