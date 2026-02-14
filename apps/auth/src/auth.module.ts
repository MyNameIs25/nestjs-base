import { Module } from '@nestjs/common';
import { AppLoggerModule } from '@app/common';
import { AuthConfigModule } from './config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [AuthConfigModule, AppLoggerModule.forRoot()],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
