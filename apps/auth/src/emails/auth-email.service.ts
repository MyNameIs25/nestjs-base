import { Injectable } from '@nestjs/common';
import { AppLogger, EmailClientService } from '@app/common';
import type { SendEmailResponse } from '@app/common';
import { welcomeTemplate } from './templates/welcome.template';

@Injectable()
export class AuthEmailService {
  constructor(
    private readonly emailClient: EmailClientService,
    private readonly logger: AppLogger,
  ) {}

  async sendWelcome(
    to: string,
    displayName: string,
  ): Promise<SendEmailResponse> {
    const content = welcomeTemplate({ displayName });

    this.logger.log(`Sending welcome email to=${to}`, 'AuthEmailService');

    const response = await this.emailClient.sendEmail({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });

    if (!response.success) {
      throw new Error(response.errorMessage || 'Failed to send welcome email');
    }

    return response;
  }
}
