import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthConfigService } from './config';
import { AppLogger } from '@app/common';

describe('AuthController', () => {
  let authController: AuthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: AuthConfigService,
          useValue: {
            app: { nodeEnv: 'test', serviceName: 'auth' },
            database: { host: 'localhost', port: 5432, name: 'auth_db' },
          },
        },
        {
          provide: AppLogger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = app.get<AuthController>(AuthController);
  });

  describe('root', () => {
    it('should return greeting with service name', () => {
      expect(authController.getHello()).toBe('Hello from auth!');
    });
  });
});
