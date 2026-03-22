/**
 * Hand-written types matching proto/email.proto.
 * Keep in sync when modifying the proto file.
 */
import type { Observable } from 'rxjs';

export interface SendEmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResponse {
  success: boolean;
  messageId: string;
  errorMessage: string;
  errorCode?: string;
}

export interface EmailServiceClient {
  sendEmail(request: SendEmailRequest): Observable<SendEmailResponse>;
}

export interface EmailServiceController {
  sendEmail(
    request: SendEmailRequest,
  ):
    | Promise<SendEmailResponse>
    | Observable<SendEmailResponse>
    | SendEmailResponse;
}
