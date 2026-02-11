import { Inject, Injectable } from '@nestjs/common';
import { appConfig, AppConfig } from '@app/common';

@Injectable()
export class PaymentsService {
  constructor(@Inject(appConfig.KEY) private readonly app: AppConfig) {}

  getHello(): string {
    return `Hello from ${this.app.serviceName}!`;
  }
}
