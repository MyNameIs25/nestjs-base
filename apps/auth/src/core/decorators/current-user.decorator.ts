import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AccessTokenPayload } from '@auth/tokens';
import type { GrpcCallContext } from '../interfaces/grpc-call-context.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const type = ctx.getType<string>();

    if (type === 'rpc') {
      const rpcContext = ctx.switchToRpc().getContext<GrpcCallContext>();
      const raw = rpcContext?.metadata?.get('user')?.[0];
      return JSON.parse(String(raw)) as AccessTokenPayload;
    }

    // HTTP and GraphQL both use the HTTP request object
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: AccessTokenPayload }>();
    return request.user;
  },
);
