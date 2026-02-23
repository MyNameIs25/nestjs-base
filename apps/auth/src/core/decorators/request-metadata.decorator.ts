import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { TokenMetadata } from '@auth/tokens';

export const RequestMetadata = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TokenMetadata => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  },
);
