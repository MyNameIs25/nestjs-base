import { Injectable } from '@nestjs/common';
import { AuthConfigService } from './config';

@Injectable()
export class AuthService {
  constructor(private readonly config: AuthConfigService) {}

  getHello(): string {
    return `Hello from ${this.config.app.SERVICE_NAME}!`;
  }
}
