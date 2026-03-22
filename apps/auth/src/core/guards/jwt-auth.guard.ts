import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppException } from '@app/common';
import { AUTH_ERRORS } from '@auth/errors';
import { TokenService, AccessTokenPayload } from '@auth/tokens';
import type { GrpcCallContext } from '../interfaces/grpc-call-context.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const type = context.getType<string>();

    if (type === 'rpc') {
      return this.handleRpc(context);
    }

    // HTTP and GraphQL both use the HTTP request object
    return this.handleHttp(context);
  }

  private handleHttp(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppException(AUTH_ERRORS.INVALID_CREDENTIALS);
    }

    const token = authHeader.slice(7);
    const payload = this.verifyToken(token);
    (request as Request & { user: AccessTokenPayload }).user = payload;
    return true;
  }

  private handleRpc(context: ExecutionContext): boolean {
    const rpcContext = context.switchToRpc().getContext<GrpcCallContext>();
    const authValue = rpcContext?.metadata?.get('authorization')?.[0];

    if (!authValue) {
      throw new AppException(AUTH_ERRORS.INVALID_CREDENTIALS);
    }

    const raw = String(authValue);
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    const payload = this.verifyToken(token);
    rpcContext.metadata!.set('user', JSON.stringify(payload));
    return true;
  }

  private verifyToken(token: string): AccessTokenPayload {
    try {
      return this.tokenService.verifyAccessToken(token);
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new AppException(AUTH_ERRORS.TOKEN_EXPIRED);
      }
      throw new AppException(AUTH_ERRORS.INVALID_CREDENTIALS);
    }
  }
}
