import { Module } from '@nestjs/common';
import { AppLogger } from '@app/common';
import { EmailAppConfigModule, EmailAppConfigService } from '../config';
import type { IEmailProvider } from './interfaces/email-provider.interface';
import { ResendProvider } from './resend/resend.provider';

export const EMAIL_PROVIDER_TOKEN = Symbol('EMAIL_PROVIDER_TOKEN');

const providerFactories: Record<
  string,
  (config: EmailAppConfigService, logger: AppLogger) => IEmailProvider
> = {
  resend: (config, logger) =>
    new ResendProvider(config.email.resendApiKey, logger),
};

@Module({
  imports: [EmailAppConfigModule],
  providers: [
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useFactory: (config: EmailAppConfigService, logger: AppLogger) => {
        const factory = providerFactories[config.email.provider];
        if (!factory) {
          throw new Error(
            `Unknown email provider: ${config.email.provider as string}`,
          );
        }
        return factory(config, logger);
      },
      inject: [EmailAppConfigService, AppLogger],
    },
  ],
  exports: [EMAIL_PROVIDER_TOKEN],
})
export class EmailProviderModule {}
