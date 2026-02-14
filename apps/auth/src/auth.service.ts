import { Injectable } from '@nestjs/common';
import { AuthConfigService } from './config';
import { AppLogger } from '@app/common';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: AuthConfigService,
    private readonly logger: AppLogger,
  ) {}

  getHello(): string {
    this.logger.log(`Hello from ${this.config.app.serviceName}!`);
    return `Hello from ${this.config.app.serviceName}!`;
  }
}
