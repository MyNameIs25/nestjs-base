export { AppExceptionModule } from './exception.module';
export { ExceptionHandler } from './exception.handler';
export { COMMON_ERRORS } from './exception.constants';
export { ERROR_DOMAINS, ERROR_SOURCE } from './exception.registry';
export { defineErrorCodes } from './factories/error-codes.factory';
export { AppException } from './exceptions/base.exception';
export type { AppExceptionOptions } from './exceptions/base.exception';
export type { ErrorCodeDef, ResolvedError } from './types/exception.type';
