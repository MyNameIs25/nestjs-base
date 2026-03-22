import { Inject, Injectable } from '@nestjs/common';
import { AppException, AppLogger } from '@app/common';
import { EMAIL_PROVIDER_TOKEN } from '../providers';
import type { IEmailProvider } from '../providers';
import {
  EmailConfigError,
  EmailRateLimitError,
  EmailValidationError,
} from '../providers/errors/email-provider.errors';
import { EmailAppConfigService } from '../config';
import { EMAIL_ERRORS } from '../errors';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

interface EmailResult {
  messageId: string;
}

@Injectable()
export class EmailService {
  private readonly defaultFrom: string;

  constructor(
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly provider: IEmailProvider,
    private readonly config: EmailAppConfigService,
    private readonly logger: AppLogger,
  ) {
    const { fromName, fromAddress } = this.config.email;
    this.defaultFrom = `${fromName} <${fromAddress}>`;
  }

  async sendEmail(params: SendEmailParams): Promise<EmailResult> {
    this.logger.log(`Sending email to=${params.to}`, 'EmailService');

    try {
      return await this.provider.send({
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        from: params.from ?? this.defaultFrom,
        replyTo: params.replyTo,
      });
    } catch (err) {
      if (err instanceof EmailRateLimitError)
        throw new AppException(EMAIL_ERRORS.RATE_LIMITED);
      if (err instanceof EmailConfigError)
        throw new AppException(EMAIL_ERRORS.PROVIDER_CONFIG_ERROR);
      if (err instanceof EmailValidationError)
        throw new AppException(EMAIL_ERRORS.VALIDATION_ERROR, {
          args: [err.message],
        });
      throw new AppException(EMAIL_ERRORS.SEND_FAILED, {
        cause: err instanceof Error ? err : undefined,
      });
    }
  }
}
