import { defineErrorCodes, ERROR_DOMAINS, ERROR_SOURCE } from '@app/common';

export const AUTH_ERRORS = defineErrorCodes(
  { domain: ERROR_DOMAINS.AUTH },
  {
    USERNAME_TAKEN: {
      source: ERROR_SOURCE.USER,
      seq: 1,
      httpStatus: 409,
      message: 'Username "%s" already exists',
    },
    INVALID_CREDENTIALS: {
      source: ERROR_SOURCE.USER,
      seq: 2,
      httpStatus: 401,
      message: 'Invalid credentials',
    },
    TOKEN_EXPIRED: {
      source: ERROR_SOURCE.USER,
      seq: 3,
      httpStatus: 401,
      message: 'Token expired',
    },
    AUTH_SERVICE_DOWN: {
      source: ERROR_SOURCE.SYSTEM,
      seq: 1,
      message: 'Auth service unavailable',
    },
  },
);
