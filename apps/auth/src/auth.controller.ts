import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TokenService, TokenMetadata } from './tokens';
import {
  JwtAuthGuard,
  RequestMetadata,
  RefreshTokenDto,
  ApiTokenPairEndpoint,
  ApiMessageEndpoint,
  ApiHealthEndpoint,
} from './core';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly tokenService: TokenService) {}

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiTokenPairEndpoint({
    summary: 'Refresh access token',
    errors: { 400: 'Validation error', 401: 'Invalid or reused refresh token' },
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @RequestMetadata() metadata: TokenMetadata,
  ) {
    return this.tokenService.refreshTokens(dto.refreshToken, metadata);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiMessageEndpoint({
    summary: 'Logout (revoke refresh token)',
    errors: { 400: 'Validation error', 401: 'Unauthorized' },
  })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.tokenService.revokeToken(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Get('health')
  @ApiHealthEndpoint({ summary: 'Health check' })
  health() {
    return { status: 'ok' };
  }
}
