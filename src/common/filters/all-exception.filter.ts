import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core'
import * as requestIp from 'request-ip'

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger()
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost
    const ctx = host.switchToHttp()
    const request = ctx.getRequest()
    const response = ctx.getResponse()
    const httpStatus = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    
    const msg = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal Server Error';

    const responseBody = {
      headers: request.headers,
      query: request.query,
      body: request.body,
      params: request.params,
      ip: requestIp.getClientIp(request),
      exception: exception instanceof Error ? exception.name : 'UnknownError',
      error: msg,
      timestamp: new Date().toISOString(),
    }

    this.logger.error('[toimc]', responseBody)
    httpAdapter.reply(response, responseBody, httpStatus)
  }
}
