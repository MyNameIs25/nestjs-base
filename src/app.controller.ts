import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { MailService } from './common/mail/mail.service';

@Controller()
export class AppController {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly mailService: MailService,
  ) {}

  @Get('hello')
  async getHello(): Promise<string> {
    const res = await this.cacheManager.get('name');
    return `Hello, ${res}`;
  }

  @Get('send-welcome')
  async sendWelcome(
    @Query('to') to: string,
    @Query('name') name: string,
  ): Promise<{ message: string }> {
    try {
      await this.mailService.sendWelcomeEmail(to, name);
      return { message: `Welcome email sent to ${to}` };
    } catch (error) {
      console.error('Mail error:', error.message, error.stack);
      throw error;
    }
  }
}
