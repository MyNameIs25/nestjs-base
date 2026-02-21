import { defineErrorCodes } from './factories/error-codes.factory';
import { ERROR_DOMAINS, ERROR_SOURCE } from './exception.registry';

export const COMMON_ERRORS = defineErrorCodes(
  { domain: ERROR_DOMAINS.COMMON },
  {
    // User errors
    BAD_REQUEST: {
      source: ERROR_SOURCE.USER,
      seq: 1,
      httpStatus: 400,
      message: 'Bad request',
    },
    UNAUTHORIZED: {
      source: ERROR_SOURCE.USER,
      seq: 2,
      httpStatus: 401,
      message: 'Unauthorized',
    },
    FORBIDDEN: {
      source: ERROR_SOURCE.USER,
      seq: 3,
      httpStatus: 403,
      message: 'Forbidden',
    },
    NOT_FOUND: {
      source: ERROR_SOURCE.USER,
      seq: 4,
      httpStatus: 404,
      message: 'Not found',
    },
    VALIDATION_FAILED: {
      source: ERROR_SOURCE.USER,
      seq: 5,
      httpStatus: 422,
      message: 'Validation failed',
    },

    // System errors
    INTERNAL_SERVER_ERROR: {
      source: ERROR_SOURCE.SYSTEM,
      seq: 1,
      httpStatus: 500,
      message: 'Internal server error',
    },
    SERVICE_UNAVAILABLE: {
      source: ERROR_SOURCE.SYSTEM,
      seq: 2,
      httpStatus: 503,
      message: 'Service unavailable',
    },

    // Third-party errors
    THIRD_PARTY_ERROR: {
      source: ERROR_SOURCE.THIRD_PARTY,
      seq: 1,
      httpStatus: 502,
      message: 'Third-party service error',
    },
    THIRD_PARTY_TIMEOUT: {
      source: ERROR_SOURCE.THIRD_PARTY,
      seq: 2,
      httpStatus: 504,
      message: 'Third-party service timeout',
    },
  },
);

/**
 * Maps HTTP status codes to the closest COMMON_ERRORS entry.
 * Used by the filter to handle NestJS HttpExceptions (from guards, pipes, etc.).
 */
export const HTTP_STATUS_TO_ERROR = new Map([
  [400, COMMON_ERRORS.BAD_REQUEST],
  [401, COMMON_ERRORS.UNAUTHORIZED],
  [403, COMMON_ERRORS.FORBIDDEN],
  [404, COMMON_ERRORS.NOT_FOUND],
  [422, COMMON_ERRORS.VALIDATION_FAILED],
  [500, COMMON_ERRORS.INTERNAL_SERVER_ERROR],
  [502, COMMON_ERRORS.THIRD_PARTY_ERROR],
  [503, COMMON_ERRORS.SERVICE_UNAVAILABLE],
  [504, COMMON_ERRORS.THIRD_PARTY_TIMEOUT],
]);
