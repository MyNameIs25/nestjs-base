import { Module } from '@nestjs/common';
import {
  AppDatabaseModule,
  AppExceptionModule,
  AppInterceptorModule,
  AppLoggerModule,
  AppMiddlewareModule,
} from '@app/common';
import { AuthConfigModule, AuthConfigService } from './config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from './users';

@Module({
  imports: [
    AuthConfigModule,
    AppMiddlewareModule,
    AppLoggerModule.forRoot(),
    AppExceptionModule,
    AppInterceptorModule,
    AppDatabaseModule.forRootAsync({
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
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
