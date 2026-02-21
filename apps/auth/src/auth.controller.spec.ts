import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthConfigService } from './config';
import { AppException, AppLogger } from '@app/common';
import { AUTH_ERRORS } from './errors';

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

  describe('error/:type', () => {
    it('should throw biz error with interpolated message', () => {
      expect(() => authController.triggerError('biz')).toThrow(AppException);
      try {
        authController.triggerError('biz');
      } catch (e) {
        const ex = e as AppException;
        expect(ex.errorCode).toBe(AUTH_ERRORS.USERNAME_TAKEN);
        expect(ex.userMessage).toBe('Username "john" already exists');
      }
    });

    it('should throw sys error with devMessage', () => {
      expect(() => authController.triggerError('sys')).toThrow(AppException);
      try {
        authController.triggerError('sys');
      } catch (e) {
        const ex = e as AppException;
        expect(ex.errorCode).toBe(AUTH_ERRORS.AUTH_SERVICE_DOWN);
        expect(ex.devMessage).toBe('Redis connection refused on port 6379');
      }
    });
  });
});
