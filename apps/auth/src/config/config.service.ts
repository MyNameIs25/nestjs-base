import { Inject, Injectable } from '@nestjs/common';
import { DatabaseConfig, databaseConfig } from './schemas/database.config';
import { AppConfig, appConfig } from '@app/common';

@Injectable()
export class AuthConfigService {
  constructor(
    @Inject(appConfig.KEY)
    readonly app: AppConfig,

    @Inject(databaseConfig.KEY)
    readonly database: DatabaseConfig,
  ) {}
}
