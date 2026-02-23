import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  AppDatabaseModule,
  AppExceptionModule,
  AppInterceptorModule,
  AppLoggerModule,
  AppMiddlewareModule,
} from '@app/common';
import { AuthConfigModule, AuthConfigService } from './config';
import { CoreModule } from './core';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    AuthConfigModule,
    AppMiddlewareModule,
    AppLoggerModule.forRoot(),
    AppExceptionModule,
    AppInterceptorModule,
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60_000, limit: 5 },
      { name: 'long', ttl: 600_000, limit: 20 },
    ]),
    AppDatabaseModule.forRootAsync({
      imports: [AuthConfigModule],
      inject: [AuthConfigService],
      useFactory: (config: AuthConfigService) => ({
        pool: {
          host: config.database.host,
          port: config.database.port,
          database: config.database.name,
          user: config.database.user,
          password: config.database.password,
        },
      }),
    }),
    CoreModule.register({ localEnabled: true }),
  ],
  controllers: [AuthController],
})
export class AuthModule {}
