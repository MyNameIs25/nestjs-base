# Email Service Patterns

## Architecture

The email service is a **pure gRPC microservice** — no HTTP server, no `AppMiddlewareModule`, `AppInterceptorModule`, or `AppExceptionModule`.

```
                        gRPC (port 50051)
[auth app] -- EmailClientModule --> [email app] -- ResendProvider --> Resend API
               (libs/common)                       (abstracted)
```

## gRPC Response Convention

The gRPC controller **never throws**. It always returns a structured response:

```typescript
interface SendEmailResponse {
  success: boolean;
  messageId: string;     // Resend message ID on success, '' on failure
  errorMessage: string;  // '' on success, error description on failure
}
```

This convention eases future migration to message queues.

## Provider Interface

All email providers implement `IEmailProvider`:

```typescript
interface IEmailProvider {
  readonly provider: string;
  send(options: SendEmailOptions): Promise<SendEmailResult>;
}
```

Currently only `ResendProvider` exists. To add a new provider:
1. Create `apps/email/src/providers/{name}.provider.ts` implementing `IEmailProvider`
2. Add the case to `EmailProviderModule` factory switch
3. Add the provider name to the `EMAIL_PROVIDER` Zod enum in `apps/email/src/config/schemas/email.config.ts`

## Provider Error Hierarchy

```
EmailSendError (base)
├── EmailRateLimitError    — 429 from provider
├── EmailConfigError       — 401/403 (invalid API key)
└── EmailValidationError   — 422 (bad recipient, etc.)
```

## Template System

Templates are TypeScript functions — type-safe, bundled, testable:

```typescript
type TemplateFunction = (data: Record<string, string>) => EmailContent;

interface EmailContent {
  subject: string;
  html: string;
  text: string;  // plain text fallback (required)
}
```

### Built-in Templates

| Name | Data Keys | Description |
|------|-----------|-------------|
| `email-verification` | `code`, `expiresIn?` | Verification code email |
| `password-reset` | `resetUrl`, `expiresIn?` | Password reset link |
| `welcome` | `displayName` | Welcome email |

### Adding New Templates

1. Create `apps/email/src/templates/definitions/{name}.template.ts`
2. Register in `TemplateRenderer` constructor
3. Add convenience method in `EmailClientService` (libs/common)

## Client Module (libs/common)

Any app can send emails by importing `EmailClientModule`:

```typescript
EmailClientModule.forRootAsync({
  imports: [AuthConfigModule],
  inject: [AuthConfigService],
  useFactory: (config: AuthConfigService) => ({
    url: config.emailGrpcUrl,
  }),
})
```

Then inject `EmailClientService` for convenience methods:

```typescript
constructor(private readonly emailClient: EmailClientService) {}

// Convenience methods
await this.emailClient.sendVerificationCode('user@example.com', '123456');
await this.emailClient.sendPasswordReset('user@example.com', 'https://...');
await this.emailClient.sendWelcome('user@example.com', 'John');
```

## Security Rules

- Never log email content (HTML body, text body)
- Log only: recipient address, template name, message ID
- API keys belong in environment variables, never in code
- `RESEND_API_KEY` goes in `apps/email/package.json` (app-specific dependency)

## Config

| Env Var | Default | Description |
|---------|---------|-------------|
| `EMAIL_PROVIDER` | `resend` | Email provider to use |
| `RESEND_API_KEY` | — | Resend API key (required) |
| `EMAIL_FROM_ADDRESS` | `noreply@idealtech.dev` | Default sender address |
| `EMAIL_FROM_NAME` | `IdealTech` | Default sender name |
| `EMAIL_GRPC_URL` | `0.0.0.0:50051` | gRPC server bind address |

## Error Domain

Email uses domain `03` in the error code registry (`ERROR_DOMAINS.EMAIL`).

## Testing

Mock `EmailClientService` in consumer app tests:

```typescript
{
  provide: EmailClientService,
  useValue: {
    sendVerificationCode: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_1', errorMessage: '' }),
    sendPasswordReset: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_2', errorMessage: '' }),
    sendWelcome: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_3', errorMessage: '' }),
  },
}
```
