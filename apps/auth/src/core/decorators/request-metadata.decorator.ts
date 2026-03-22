import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { TokenMetadata } from '@auth/tokens';

interface GrpcCallContext {
  metadata?: {
    get(key: string): (string | Buffer)[];
  };
}

export const RequestMetadata = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TokenMetadata => {
    const type = ctx.getType<string>();

    if (type === 'rpc') {
      return extractFromRpc(ctx);
    }

    return extractFromHttp(ctx);
  },
);

function extractFromHttp(ctx: ExecutionContext): TokenMetadata {
  const req = ctx.switchToHttp().getRequest<Request>();
  return {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  };
}

function extractFromRpc(ctx: ExecutionContext): TokenMetadata {
  try {
    const rpcContext = ctx.switchToRpc().getContext<GrpcCallContext>();
    const userAgent = rpcContext?.metadata?.get('user-agent')?.[0];
    const ipAddress = rpcContext?.metadata?.get('x-forwarded-for')?.[0];
    return {
      userAgent: userAgent ? String(userAgent) : undefined,
      ipAddress: ipAddress ? String(ipAddress) : undefined,
    };
  } catch {
    return {};
  }
}
