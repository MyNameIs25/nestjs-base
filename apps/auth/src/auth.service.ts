import { Injectable } from '@nestjs/common';
import { AppException, AppLogger, COMMON_ERRORS } from '@app/common';
import { AuthConfigService } from './config';
import { AUTH_ERRORS } from './errors';

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

  triggerError(type: string): never {
    switch (type) {
      case 'biz':
        throw new AppException(AUTH_ERRORS.USERNAME_TAKEN, {
          args: ['john'],
        });
      case 'sys':
        throw new AppException(AUTH_ERRORS.AUTH_SERVICE_DOWN, {
          devMessage: 'Redis connection refused on port 6379',
        });
      case 'not-found':
        throw new AppException(COMMON_ERRORS.NOT_FOUND);
      default:
        throw new AppException(COMMON_ERRORS.BAD_REQUEST, {
          devMessage: `Unknown error type: ${type}`,
        });
    }
  }
}
