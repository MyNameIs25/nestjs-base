import { defineErrorCodes, ERROR_DOMAINS, ERROR_SOURCE } from '@app/common';

export const EMAIL_ERRORS = defineErrorCodes(
  { domain: ERROR_DOMAINS.EMAIL },
  {
    SEND_FAILED: {
      source: ERROR_SOURCE.SYSTEM,
      seq: 1,
      message: 'Failed to send email',
    },
    RATE_LIMITED: {
      source: ERROR_SOURCE.THIRD_PARTY,
      seq: 1,
      message: 'Email provider rate limit exceeded',
    },
    PROVIDER_CONFIG_ERROR: {
      source: ERROR_SOURCE.SYSTEM,
      seq: 2,
      message: 'Email provider configuration error',
    },
    VALIDATION_ERROR: {
      source: ERROR_SOURCE.USER,
      seq: 2,
      httpStatus: 422,
      message: 'Email validation error: %s',
    },
  },
);
