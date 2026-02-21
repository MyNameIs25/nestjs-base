import { HttpException } from '@nestjs/common';
import type { ErrorCodeDef } from '../types/exception.type';

export interface AppExceptionOptions {
  args?: string[];
  devMessage?: string;
  cause?: Error;
}

function interpolate(template: string, args: string[]): string {
  let i = 0;
  return template.replace(/%s/g, () => args[i++] ?? '%s');
}

export class AppException extends HttpException {
  readonly errorCode: ErrorCodeDef;
  readonly userMessage: string;
  readonly devMessage?: string;

  constructor(errorCode: ErrorCodeDef, options: AppExceptionOptions = {}) {
    const userMessage = options.args?.length
      ? interpolate(errorCode.message, options.args)
      : errorCode.message;

    super(userMessage, errorCode.httpStatus, { cause: options.cause });

    this.errorCode = errorCode;
    this.userMessage = userMessage;
    this.devMessage = options.devMessage;
  }
}
