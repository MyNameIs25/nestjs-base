import { Module } from '@nestjs/common';
import { AuthConfigService } from './config.service';
import { databaseConfig } from './schemas/database.config';
import { AppConfigModule } from '@app/common';

@Module({
  imports: [
    AppConfigModule.forRoot({
      namespaces: [databaseConfig],
    }),
  ],
  providers: [AuthConfigService],
  exports: [AuthConfigService],
})
export class AuthConfigModule {}
