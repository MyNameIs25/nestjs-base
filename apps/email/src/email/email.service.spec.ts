import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { EMAIL_PROVIDER_TOKEN } from '../providers';
import { EmailAppConfigService } from '../config';
import { AppException, AppLogger } from '@app/common';
import { EMAIL_ERRORS } from '../errors';
import {
  EmailRateLimitError,
  EmailConfigError,
  EmailValidationError,
} from '../providers/errors/email-provider.errors';

describe('EmailService', () => {
  let service: EmailService;
  let mockProvider: { send: jest.Mock; provider: string };

  beforeEach(async () => {
    mockProvider = {
      provider: 'resend',
      send: jest.fn().mockResolvedValue({ messageId: 'msg_123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: EMAIL_PROVIDER_TOKEN,
          useValue: mockProvider,
        },
        {
          provide: EmailAppConfigService,
          useValue: {
            app: { nodeEnv: 'test', serviceName: 'email' },
            email: {
              provider: 'resend',
              resendApiKey: 'test',
              fromAddress: 'noreply@idealtech.dev',
              fromName: 'IdealTech',
              grpcUrl: '0.0.0.0:50051',
            },
          },
        },
        {
          provide: AppLogger,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('sendEmail', () => {
    it('should send email via provider', async () => {
      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Hello</p>',
        text: 'Hello',
      });

      expect(result.messageId).toBe('msg_123');
      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Test Subject',
          html: '<p>Hello</p>',
          text: 'Hello',
          from: 'IdealTech <noreply@idealtech.dev>',
        }),
      );
    });

    it('should use custom from when provided', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hi</p>',
        from: 'Custom <custom@example.com>',
      });

      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'Custom <custom@example.com>' }),
      );
    });

    it('should pass replyTo to provider', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hi</p>',
        replyTo: 'support@example.com',
      });

      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({ replyTo: 'support@example.com' }),
      );
    });

    it('should map EmailRateLimitError to RATE_LIMITED AppException', async () => {
      mockProvider.send.mockRejectedValue(new EmailRateLimitError('resend'));

      try {
        await service.sendEmail({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Hi</p>',
        });
      } catch (err) {
        expect(err).toBeInstanceOf(AppException);
        expect((err as AppException).errorCode).toBe(EMAIL_ERRORS.RATE_LIMITED);
      }
    });

    it('should map EmailConfigError to PROVIDER_CONFIG_ERROR AppException', async () => {
      mockProvider.send.mockRejectedValue(new EmailConfigError('resend'));

      try {
        await service.sendEmail({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Hi</p>',
        });
      } catch (err) {
        expect(err).toBeInstanceOf(AppException);
        expect((err as AppException).errorCode).toBe(
          EMAIL_ERRORS.PROVIDER_CONFIG_ERROR,
        );
      }
    });

    it('should map EmailValidationError to VALIDATION_ERROR AppException', async () => {
      mockProvider.send.mockRejectedValue(
        new EmailValidationError('Bad recipient', 'resend'),
      );

      try {
        await service.sendEmail({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Hi</p>',
        });
      } catch (err) {
        expect(err).toBeInstanceOf(AppException);
        expect((err as AppException).errorCode).toBe(
          EMAIL_ERRORS.VALIDATION_ERROR,
        );
      }
    });

    it('should map unknown errors to SEND_FAILED AppException', async () => {
      mockProvider.send.mockRejectedValue(new Error('Unknown error'));

      try {
        await service.sendEmail({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Hi</p>',
        });
      } catch (err) {
        expect(err).toBeInstanceOf(AppException);
        expect((err as AppException).errorCode).toBe(EMAIL_ERRORS.SEND_FAILED);
      }
    });
  });
});
