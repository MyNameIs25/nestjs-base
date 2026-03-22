import { AppLogger } from '@app/common';
import { ResendProvider } from './resend.provider';
import {
  EmailConfigError,
  EmailRateLimitError,
  EmailSendError,
  EmailValidationError,
} from '../errors/email-provider.errors';

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn() },
  })),
}));

describe('ResendProvider', () => {
  let provider: ResendProvider;
  let mockSend: jest.Mock;

  const mockLogger: AppLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    fatal: jest.fn(),
    setLogLevels: jest.fn(),
  } as unknown as AppLogger;

  beforeEach(() => {
    provider = new ResendProvider('re_test_key', mockLogger);
    mockSend = jest.mocked(
      (provider as unknown as { client: { emails: { send: jest.Mock } } })
        .client.emails.send,
    );
    jest.clearAllMocks();
  });

  it('should send email successfully', async () => {
    mockSend.mockResolvedValue({ data: { id: 'msg_123' }, error: null });

    const result = await provider.send({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(result.messageId).toBe('msg_123');
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      }),
    );
  });

  it('should throw EmailRateLimitError on rate_limit_exceeded', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'Rate limited' },
    });

    await expect(
      provider.send({ to: 'user@example.com', subject: 'Test', html: '' }),
    ).rejects.toThrow(EmailRateLimitError);
  });

  it('should throw EmailConfigError on missing_api_key', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'missing_api_key', message: 'Invalid API key' },
    });

    await expect(
      provider.send({ to: 'user@example.com', subject: 'Test', html: '' }),
    ).rejects.toThrow(EmailConfigError);
  });

  it('should throw EmailConfigError on invalid_api_Key', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'invalid_api_Key', message: 'Forbidden' },
    });

    await expect(
      provider.send({ to: 'user@example.com', subject: 'Test', html: '' }),
    ).rejects.toThrow(EmailConfigError);
  });

  it('should throw EmailConfigError on invalid_access', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'invalid_access', message: 'Forbidden' },
    });

    await expect(
      provider.send({ to: 'user@example.com', subject: 'Test', html: '' }),
    ).rejects.toThrow(EmailConfigError);
  });

  it('should throw EmailValidationError on validation_error', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Invalid email' },
    });

    await expect(
      provider.send({ to: 'user@example.com', subject: 'Test', html: '' }),
    ).rejects.toThrow(EmailValidationError);
  });

  it('should throw EmailValidationError on invalid_from_address', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'invalid_from_address', message: 'Bad from' },
    });

    await expect(
      provider.send({ to: 'user@example.com', subject: 'Test', html: '' }),
    ).rejects.toThrow(EmailValidationError);
  });

  it('should throw EmailValidationError on missing_required_field', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: {
        name: 'missing_required_field',
        message: 'Invalid email address',
      },
    });

    await expect(
      provider.send({ to: 'invalid', subject: 'Test', html: '' }),
    ).rejects.toThrow(EmailValidationError);
  });

  it('should throw EmailSendError on network error', async () => {
    mockSend.mockRejectedValue(new Error('Network error'));

    await expect(
      provider.send({ to: 'user@example.com', subject: 'Test', html: '' }),
    ).rejects.toThrow(EmailSendError);
  });

  it('should have provider name "resend"', () => {
    expect(provider.provider).toBe('resend');
  });
});
