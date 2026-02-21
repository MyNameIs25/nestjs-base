import { Module } from '@nestjs/common';
import {
  AppExceptionModule,
  AppInterceptorModule,
  AppLoggerModule,
} from '@app/common';
import { AuthConfigModule } from './config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    AuthConfigModule,
    AppLoggerModule.forRoot(),
    AppExceptionModule,
    AppInterceptorModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
