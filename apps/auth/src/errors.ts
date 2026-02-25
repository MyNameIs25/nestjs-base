import { defineErrorCodes, ERROR_DOMAINS, ERROR_SOURCE } from '@app/common';

export const AUTH_ERRORS = defineErrorCodes(
  { domain: ERROR_DOMAINS.AUTH },
  {
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
    EMAIL_TAKEN: {
      source: ERROR_SOURCE.USER,
      seq: 4,
      httpStatus: 409,
      message: 'Email "%s" is already registered',
    },
    INVALID_REFRESH_TOKEN: {
      source: ERROR_SOURCE.USER,
      seq: 5,
      httpStatus: 401,
      message: 'Invalid or expired refresh token',
    },
    TOKEN_REUSE_DETECTED: {
      source: ERROR_SOURCE.USER,
      seq: 6,
      httpStatus: 401,
      message: 'Token reuse detected, all sessions revoked',
    },
    ACCOUNT_SUSPENDED: {
      source: ERROR_SOURCE.USER,
      seq: 7,
      httpStatus: 403,
      message: 'Account has been suspended',
    },
    AUTH_SERVICE_DOWN: {
      source: ERROR_SOURCE.SYSTEM,
      seq: 1,
      message: 'Auth service unavailable',
    },
  },
);
