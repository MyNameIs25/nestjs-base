import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AppException } from '@app/common';
import type {
  SendEmailRequest,
  SendEmailResponse,
  EmailServiceController,
} from '@app/common';
import { EmailService } from './email.service';

@Controller()
export class EmailGrpcController implements EmailServiceController {
  constructor(private readonly emailService: EmailService) {}

  @GrpcMethod('EmailService', 'SendEmail')
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      const result = await this.emailService.sendEmail({
        to: request.to,
        subject: request.subject,
        html: request.html,
        text: request.text,
        from: request.from,
        replyTo: request.replyTo,
      });

      return { success: true, messageId: result.messageId, errorMessage: '' };
    } catch (err) {
      if (err instanceof AppException) {
        return {
          success: false,
          messageId: '',
          errorCode: err.errorCode.code,
          errorMessage: err.message,
        };
      }
      return {
        success: false,
        messageId: '',
        errorCode: '',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
