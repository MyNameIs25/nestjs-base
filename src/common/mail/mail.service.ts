import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject: 'Welcome to our platform!',
      template: 'welcome',
      context: {
        name,
      },
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    template: string;
    context?: Record<string, unknown>;
  }): Promise<void> {
    await this.mailerService.sendMail(options);
  }
}
