import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppExceptionFilter } from './filters/app-exception.filter';
import { ExceptionHandler } from './exception.handler';

@Module({
  providers: [
    ExceptionHandler,
    { provide: APP_FILTER, useClass: AppExceptionFilter },
  ],
  exports: [ExceptionHandler],
})
export class AppExceptionModule {}
