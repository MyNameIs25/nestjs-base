import { Module } from '@nestjs/common';
import { UsersModule } from '@auth/users';
import { AuthMethodsModule } from '@auth/auth-methods';
import { TokensModule } from '@auth/tokens';
import { LocalAuthController } from './local-auth.controller';
import { LocalAuthService } from './local-auth.service';

@Module({
  imports: [UsersModule, AuthMethodsModule, TokensModule],
  controllers: [LocalAuthController],
  providers: [LocalAuthService],
})
export class LocalAuthModule {}
