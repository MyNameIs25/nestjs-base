import { COMMON_ERRORS } from '../exception.constants';
import { AppException } from './base.exception';

describe('AppException', () => {
  it('should set errorCode and userMessage', () => {
    const ex = new AppException(COMMON_ERRORS.BAD_REQUEST);

    expect(ex.errorCode).toBe(COMMON_ERRORS.BAD_REQUEST);
    expect(ex.userMessage).toBe('Bad request');
    expect(ex.getStatus()).toBe(400);
  });

  it('should interpolate %s placeholders in message', () => {
    const errorCode = {
      code: 'A01001',
      httpStatus: 409,
      message: 'Username "%s" already exists',
    };

    const ex = new AppException(errorCode, { args: ['john'] });

    expect(ex.userMessage).toBe('Username "john" already exists');
  });

  it('should preserve devMessage', () => {
    const ex = new AppException(COMMON_ERRORS.BAD_REQUEST, {
      devMessage: 'Missing field: email',
    });

    expect(ex.devMessage).toBe('Missing field: email');
  });

  it('should attach cause', () => {
    const cause = new Error('original');
    const ex = new AppException(COMMON_ERRORS.BAD_REQUEST, { cause });

    expect(ex.cause).toBe(cause);
  });

  it('should work with system error codes', () => {
    const ex = new AppException(COMMON_ERRORS.INTERNAL_SERVER_ERROR);

    expect(ex.errorCode).toBe(COMMON_ERRORS.INTERNAL_SERVER_ERROR);
    expect(ex.getStatus()).toBe(500);
  });

  it('should preserve devMessage and cause for system errors', () => {
    const cause = new Error('db connection lost');
    const ex = new AppException(COMMON_ERRORS.INTERNAL_SERVER_ERROR, {
      devMessage: 'Pool exhausted',
      cause,
    });

    expect(ex.devMessage).toBe('Pool exhausted');
    expect(ex.cause).toBe(cause);
  });
});
