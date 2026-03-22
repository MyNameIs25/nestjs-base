import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users';
import { AuthConfigModule } from '../config';
import { TokenRepository } from './token.repository';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({}), UsersModule, AuthConfigModule],
  providers: [TokenRepository, TokenService],
  exports: [TokenRepository, TokenService],
})
export class TokensModule {}
