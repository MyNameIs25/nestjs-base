import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { BaseRepository, InjectDrizzle, DrizzleDB } from '@app/common';
import { users } from './user.schema';

@Injectable()
export class UserRepository extends BaseRepository<typeof users> {
  constructor(@InjectDrizzle() db: DrizzleDB) {
    super(db, users, users.id);
  }

  async findByEmail(email: string) {
    return this.findOne(eq(users.email, email));
  }

  async findByUsername(username: string) {
    return this.findOne(eq(users.username, username));
  }
}
