import { Module } from '@nestjs/common';
import { AppConfigModule } from '@app/common';
import { AuthConfigService } from './config';
import { databaseConfig } from './config/schemas/database.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    AppConfigModule.forRoot({
      namespaces: [databaseConfig],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthConfigService, AuthService],
})
export class AuthModule {}
