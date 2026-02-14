import { Injectable, LoggerService } from '@nestjs/common';
import { Logger as PinoNestLogger } from 'nestjs-pino';

@Injectable()
export class AppLogger implements LoggerService {
  constructor(private readonly pino: PinoNestLogger) {}

  log(message: any, ...optionalParams: any[]) {
    this.pino.log(message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.pino.error(message, ...optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.pino.warn(message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    this.pino.debug(message, ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    this.pino.verbose(message, ...optionalParams);
  }

  fatal(message: any, ...optionalParams: any[]) {
    this.pino.fatal(message, ...optionalParams);
  }
}
