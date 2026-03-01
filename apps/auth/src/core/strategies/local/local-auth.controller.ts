import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { LocalAuthService } from './local-auth.service';
import { TokenMetadata } from '@auth/tokens';
import { THROTTLE_PRESETS } from '@app/common';
import { RequestMetadata } from '../../decorators/request-metadata.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ApiTokenPairEndpoint } from '../../decorators/api-responses.decorator';

@ApiTags('Auth')
@Controller('auth/local')
export class LocalAuthController {
  constructor(private readonly localAuthService: LocalAuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @Throttle(THROTTLE_PRESETS.STRICT)
  @ApiTokenPairEndpoint({
    summary: 'Register with email and password',
    status: 201,
    errors: {
      400: 'Validation error',
      409: 'Email already taken',
      429: 'Too many requests',
    },
  })
  async register(
    @Body() dto: RegisterDto,
    @RequestMetadata() metadata: TokenMetadata,
  ) {
    return this.localAuthService.register(dto, metadata);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle(THROTTLE_PRESETS.DEFAULT)
  @ApiTokenPairEndpoint({
    summary: 'Login with email and password',
    errors: {
      400: 'Validation error',
      401: 'Invalid credentials',
      403: 'Account suspended',
      429: 'Too many requests',
    },
  })
  async login(
    @Body() dto: LoginDto,
    @RequestMetadata() metadata: TokenMetadata,
  ) {
    return this.localAuthService.login(dto, metadata);
  }
}
