import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { ExceptionHandler } from '../exception.handler';
import type { ErrorResponseBody } from '../types/exception.type';

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private readonly handler: ExceptionHandler) {}

  catch(exception: unknown, host: ArgumentsHost): void | Observable<never> {
    const type = host.getType<string>();

    if (type === 'rpc') {
      return this.handleRpc(exception);
    }

    if (type === 'graphql') {
      return this.handleGraphql(exception, host);
    }

    this.handleHttp(exception, host);
  }

  private handleHttp(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request & { id?: string }>();
    const response = ctx.getResponse<Response>();

    const { errorCode, message, devMessage, status } =
      this.handler.resolve(exception);
    const traceId = request.id ?? 'unknown';

    this.handler.log(exception, errorCode, traceId);

    const body: ErrorResponseBody = {
      success: false,
      code: errorCode.code,
      message,
      timestamp: new Date().toISOString(),
      traceId,
    };

    if (!this.isProduction && devMessage) {
      body.devMessage = devMessage;
    }

    response.status(status).json(body);
  }

  private handleRpc(exception: unknown): Observable<never> {
    const { errorCode, message, devMessage, status } =
      this.handler.resolve(exception);

    this.handler.log(exception, errorCode, 'rpc');

    const payload: Record<string, unknown> = {
      code: errorCode.code,
      message,
      status,
    };

    if (!this.isProduction && devMessage) {
      payload.devMessage = devMessage;
    }

    return throwError(() => payload);
  }

  private handleGraphql(exception: unknown, host: ArgumentsHost): never {
    const { errorCode, message, devMessage, status } =
      this.handler.resolve(exception);

    // GraphQL runs over HTTP — extract traceId from underlying request
    let traceId = 'unknown';
    try {
      const request = host.switchToHttp().getRequest<{ id?: string }>();
      traceId = request?.id ?? 'unknown';
    } catch {
      // switchToHttp() may not work in all GraphQL contexts
    }

    this.handler.log(exception, errorCode, traceId);

    const extensions: Record<string, unknown> = { code: errorCode.code };
    if (!this.isProduction && devMessage) {
      extensions.devMessage = devMessage;
    }

    throw new HttpException({ message, ...extensions }, status);
  }
}
