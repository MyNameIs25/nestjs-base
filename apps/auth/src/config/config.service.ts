import { Inject, Injectable } from '@nestjs/common';
import { DatabaseConfig, databaseConfig } from './schemas/database.config';
import { JwtConfig, jwtConfig } from './schemas/jwt.config';
import { SecurityConfig, securityConfig } from './schemas/security.config';
import { AppConfig, appConfig } from '@app/common';

@Injectable()
export class AuthConfigService {
  constructor(
    @Inject(appConfig.KEY)
    readonly app: AppConfig,

    @Inject(databaseConfig.KEY)
    readonly database: DatabaseConfig,

    @Inject(jwtConfig.KEY)
    readonly jwt: JwtConfig,

    @Inject(securityConfig.KEY)
    readonly security: SecurityConfig,
  ) {}
}
