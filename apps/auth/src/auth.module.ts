import { Module } from '@nestjs/common';
import { AuthConfigModule } from './config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [AuthConfigModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
