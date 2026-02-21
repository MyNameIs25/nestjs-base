import { Module } from '@nestjs/common';
import {
  AppConfigModule,
  AppExceptionModule,
  AppInterceptorModule,
  AppLoggerModule,
  AppMiddlewareModule,
} from '@app/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    AppConfigModule.forRoot(),
    AppMiddlewareModule,
    AppLoggerModule.forRoot(),
    AppExceptionModule,
    AppInterceptorModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
