import { Test, TestingModule } from '@nestjs/testing';
import { appConfig } from '@app/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let paymentsController: PaymentsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        PaymentsService,
        {
          provide: appConfig.KEY,
          useValue: { NODE_ENV: 'test', SERVICE_NAME: 'payments' },
        },
      ],
    }).compile();

    paymentsController = app.get<PaymentsController>(PaymentsController);
  });

  describe('root', () => {
    it('should return greeting with service name', () => {
      expect(paymentsController.getHello()).toBe('Hello from payments!');
    });
  });
});
