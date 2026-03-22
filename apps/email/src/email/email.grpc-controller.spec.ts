import { Test, TestingModule } from '@nestjs/testing';
import { EmailGrpcController } from './email.grpc-controller';
import { EmailService } from './email.service';
import { AppException } from '@app/common';
import { EMAIL_ERRORS } from '../errors';

describe('EmailGrpcController', () => {
  let controller: EmailGrpcController;
  let mockEmailService: { sendEmail: jest.Mock };

  beforeEach(async () => {
    mockEmailService = {
      sendEmail: jest.fn().mockResolvedValue({ messageId: 'msg_123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailGrpcController],
      providers: [{ provide: EmailService, useValue: mockEmailService }],
    }).compile();

    controller = module.get<EmailGrpcController>(EmailGrpcController);
  });

  describe('sendEmail', () => {
    it('should return success response', async () => {
      const result = await controller.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result).toEqual({
        success: true,
        messageId: 'msg_123',
        errorMessage: '',
      });
    });

    it('should return error response with errorCode on AppException', async () => {
      mockEmailService.sendEmail.mockRejectedValue(
        new AppException(EMAIL_ERRORS.SEND_FAILED),
      );

      const result = await controller.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result).toEqual({
        success: false,
        messageId: '',
        errorCode: EMAIL_ERRORS.SEND_FAILED.code,
        errorMessage: EMAIL_ERRORS.SEND_FAILED.message,
      });
    });

    it('should return error response without errorCode on unknown error', async () => {
      mockEmailService.sendEmail.mockRejectedValue(new Error('Unexpected'));

      const result = await controller.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result).toEqual({
        success: false,
        messageId: '',
        errorCode: '',
        errorMessage: 'Unexpected',
      });
    });
  });
});
