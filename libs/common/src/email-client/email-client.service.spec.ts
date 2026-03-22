import { Test, TestingModule } from '@nestjs/testing';
import { EmailClientService } from './email-client.service';
import { EMAIL_SERVICE_TOKEN } from './constants';
import { of } from 'rxjs';

describe('EmailClientService', () => {
  let service: EmailClientService;
  let mockGrpcService: {
    sendEmail: jest.Mock;
  };
  let mockClient: { getService: jest.Mock };

  beforeEach(async () => {
    mockGrpcService = {
      sendEmail: jest.fn(),
    };

    mockClient = {
      getService: jest.fn().mockReturnValue(mockGrpcService),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailClientService,
        { provide: EMAIL_SERVICE_TOKEN, useValue: mockClient },
      ],
    }).compile();

    service = module.get<EmailClientService>(EmailClientService);
    service.onModuleInit();
  });

  it('should call getService on init', () => {
    expect(mockClient.getService).toHaveBeenCalledWith('EmailService');
  });

  describe('sendEmail', () => {
    it('should forward to gRPC service', async () => {
      mockGrpcService.sendEmail.mockReturnValue(
        of({ success: true, messageId: 'msg_1', errorMessage: '' }),
      );

      const result = await service.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(mockGrpcService.sendEmail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_1');
    });
  });
});
