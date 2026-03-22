export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  messageId: string;
}

export interface IEmailProvider {
  readonly provider: string;
  send(options: SendEmailOptions): Promise<SendEmailResult>;
}
