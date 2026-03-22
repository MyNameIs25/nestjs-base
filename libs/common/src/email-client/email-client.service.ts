import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom, Observable } from 'rxjs';
import { EMAIL_SERVICE_TOKEN, EMAIL_SERVICE_NAME } from './constants';
import type {
  SendEmailRequest,
  SendEmailResponse,
} from './interfaces/email-service.interface';

interface EmailGrpcService {
  sendEmail(request: SendEmailRequest): Observable<SendEmailResponse>;
}

@Injectable()
export class EmailClientService implements OnModuleInit {
  private emailService!: EmailGrpcService;

  constructor(
    @Inject(EMAIL_SERVICE_TOKEN) private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.emailService =
      this.client.getService<EmailGrpcService>(EMAIL_SERVICE_NAME);
  }

  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    return firstValueFrom(this.emailService.sendEmail(request));
  }
}
