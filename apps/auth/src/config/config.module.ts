import { Module } from '@nestjs/common';
import { AuthConfigService } from './config.service';
import { databaseConfig } from './schemas/database.config';
import { jwtConfig } from './schemas/jwt.config';
import { securityConfig } from './schemas/security.config';
import { AppConfigModule } from '@app/common';

@Module({
  imports: [
    AppConfigModule.forRoot({
      namespaces: [databaseConfig, jwtConfig, securityConfig],
    }),
  ],
  providers: [AuthConfigService],
  exports: [AuthConfigService],
})
export class AuthConfigModule {}
