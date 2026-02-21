import { HttpException, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { GraphQLError } from 'graphql';
import { AppLogger } from '../logger/logger.service';
import { AppException } from './exceptions/base.exception';
import { COMMON_ERRORS, HTTP_STATUS_TO_ERROR } from './exception.constants';
import { ERROR_SOURCE } from './exception.registry';
import type { ErrorCodeDef, ResolvedError } from './types/exception.type';

@Injectable()
export class ExceptionHandler {
  constructor(private readonly logger: AppLogger) {}

  resolve(exception: unknown): ResolvedError {
    // Case 1: Our custom exceptions (transport-agnostic)
    if (exception instanceof AppException) {
      const isUserError = exception.errorCode.code[0] === ERROR_SOURCE.USER;

      return {
        errorCode: exception.errorCode,
        message: exception.userMessage,
        devMessage:
          exception.devMessage ??
          (isUserError ? undefined : (exception as Error).stack),
        status: exception.getStatus(),
      };
    }

    // Case 2: NestJS HttpExceptions (from guards, pipes, etc.)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const errorCode =
        HTTP_STATUS_TO_ERROR.get(status) ?? COMMON_ERRORS.INTERNAL_SERVER_ERROR;
      const exceptionResponse = exception.getResponse();

      let devMessage: string | undefined;
      if (typeof exceptionResponse === 'string') {
        devMessage = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const msg = (exceptionResponse as Record<string, unknown>).message;
        devMessage = Array.isArray(msg) ? msg.join('; ') : String(msg);
      }

      return {
        errorCode: { ...errorCode, httpStatus: status },
        message: errorCode.message,
        devMessage,
        status,
      };
    }

    // Case 3: RpcException (from @nestjs/microservices)
    if (exception instanceof RpcException) {
      const error = exception.getError();
      const devMessage =
        typeof error === 'string' ? error : JSON.stringify(error);

      return {
        errorCode: COMMON_ERRORS.INTERNAL_SERVER_ERROR,
        message: COMMON_ERRORS.INTERNAL_SERVER_ERROR.message,
        devMessage,
        status: 500,
      };
    }

    // Case 4: GraphQLError (from graphql package)
    if (exception instanceof GraphQLError) {
      return {
        errorCode: COMMON_ERRORS.BAD_REQUEST,
        message: exception.message || COMMON_ERRORS.BAD_REQUEST.message,
        devMessage: exception.extensions
          ? JSON.stringify(exception.extensions)
          : undefined,
        status: 400,
      };
    }

    // Case 5: Unknown errors
    const devMessage =
      exception instanceof Error ? exception.stack : String(exception);

    return {
      errorCode: COMMON_ERRORS.INTERNAL_SERVER_ERROR,
      message: COMMON_ERRORS.INTERNAL_SERVER_ERROR.message,
      devMessage,
      status: 500,
    };
  }

  log(exception: unknown, errorCode: ErrorCodeDef, traceId: string): void {
    const context = `ExceptionFilter[${errorCode.code}]`;

    if (
      exception instanceof AppException &&
      errorCode.code[0] === ERROR_SOURCE.USER
    ) {
      this.logger.warn(
        `[${traceId}] ${errorCode.code}: ${exception.userMessage}`,
        context,
      );
      return;
    }

    const message =
      exception instanceof Error ? exception.message : String(exception);
    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `[${traceId}] ${errorCode.code}: ${message}`,
      stack,
      context,
    );
  }
}
