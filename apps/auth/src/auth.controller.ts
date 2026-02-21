import { Controller, Get, Param } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  getHello(): string {
    return this.authService.getHello();
  }

  @Get('error/:type')
  triggerError(@Param('type') type: string): never {
    return this.authService.triggerError(type);
  }
}
