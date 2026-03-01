import { Module } from '@nestjs/common';
import { AuthMethodRepository } from './auth-method.repository';

@Module({
  providers: [AuthMethodRepository],
  exports: [AuthMethodRepository],
})
export class AuthMethodsModule {}
