import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponseBody<T = unknown> {
  success: true;
  data: T;
  timestamp: string;
  traceId: string;
}

interface GrpcCallContext {
  metadata?: {
    get(key: string): (string | Buffer)[];
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponseBody<T> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponseBody<T> | T> {
    const type = context.getType<string>();

    if (type === 'rpc') {
      return this.handleRpc(context, next);
    }

    // GraphQL engine manages its own response format — pass through
    if (type === 'graphql') {
      return next.handle();
    }

    return this.handleHttp(context, next);
  }

  private handleHttp(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponseBody<T>> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { id?: string }>();

    return this.wrapResponse(next, request.id ?? 'unknown');
  }

  private handleRpc(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponseBody<T>> {
    let traceId = 'unknown';
    try {
      const rpcContext = context.switchToRpc().getContext<GrpcCallContext>();
      const value = rpcContext?.metadata?.get('x-request-id')?.[0];
      if (value) traceId = String(value);
    } catch {
      // Unable to extract traceId from RPC context
    }

    return this.wrapResponse(next, traceId);
  }

  private wrapResponse(
    next: CallHandler<T>,
    traceId: string,
  ): Observable<SuccessResponseBody<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        timestamp: new Date().toISOString(),
        traceId,
      })),
    );
  }
}
