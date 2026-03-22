import { Resend } from 'resend';
import { AppLogger } from '@app/common';
import type {
  IEmailProvider,
  SendEmailOptions,
  SendEmailResult,
} from '../interfaces/email-provider.interface';
import {
  EmailConfigError,
  EmailRateLimitError,
  EmailSendError,
  EmailValidationError,
} from '../errors/email-provider.errors';

export class ResendProvider implements IEmailProvider {
  readonly provider = 'resend';
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly logger: AppLogger,
  ) {
    this.client = new Resend(apiKey);
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    this.logger.log(
      `Sending email via Resend to=${options.to}`,
      'ResendProvider',
    );

    try {
      const { data, error } = await this.client.emails.send({
        from: options.from ?? '',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      });

      if (error) {
        throw this.mapResendError(error);
      }

      this.logger.log(
        `Email sent via Resend messageId=${data?.id}`,
        'ResendProvider',
      );

      return { messageId: data?.id ?? '' };
    } catch (err) {
      if (err instanceof EmailSendError) {
        throw err;
      }
      throw this.mapUnknownError(err);
    }
  }

  private mapResendError(error: {
    name: string;
    message: string;
  }): EmailSendError {
    switch (error.name) {
      case 'rate_limit_exceeded':
        return new EmailRateLimitError(this.provider);
      case 'missing_api_key':
      case 'invalid_api_Key':
      case 'invalid_access':
        return new EmailConfigError(this.provider);
      case 'validation_error':
      case 'missing_required_field':
      case 'invalid_from_address':
      case 'invalid_parameter':
      case 'invalid_region':
        return new EmailValidationError(error.message, this.provider);
      default:
        return new EmailSendError(error.message, this.provider);
    }
  }

  private mapUnknownError(err: unknown): EmailSendError {
    const cause = err instanceof Error ? err : new Error(String(err));
    return new EmailSendError(
      `Unexpected error: ${cause.message}`,
      this.provider,
      cause,
    );
  }
}
