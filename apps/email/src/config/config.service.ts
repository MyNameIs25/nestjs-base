import { Inject, Injectable } from '@nestjs/common';
import { AppConfig, appConfig } from '@app/common';
import { EmailConfig, emailConfig } from './schemas/email.config';

@Injectable()
export class EmailAppConfigService {
  constructor(
    @Inject(appConfig.KEY)
    readonly app: AppConfig,

    @Inject(emailConfig.KEY)
    readonly email: EmailConfig,
  ) {}
}
