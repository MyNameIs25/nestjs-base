import { Module } from '@nestjs/common';
import { EmailAppConfigService } from './config.service';
import { emailConfig } from './schemas/email.config';
import { AppConfigModule } from '@app/common';

@Module({
  imports: [
    AppConfigModule.forRoot({
      namespaces: [emailConfig],
    }),
  ],
  providers: [EmailAppConfigService],
  exports: [EmailAppConfigService],
})
export class EmailAppConfigModule {}
