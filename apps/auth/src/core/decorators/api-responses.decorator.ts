import { ApiEndpoint } from '@app/common';
import type { ApiEndpointOptions } from '@app/common';
import { TokenPairResponseDto } from '../dto/responses/token-pair-response.dto';
import { MessageResponseDto } from '../dto/responses/message-response.dto';
import { HealthResponseDto } from '../dto/responses/health-response.dto';

type OmitResponseType = Omit<ApiEndpointOptions, 'responseType'>;

export function ApiTokenPairEndpoint(opts: OmitResponseType) {
  return ApiEndpoint({ ...opts, responseType: TokenPairResponseDto });
}

export function ApiMessageEndpoint(opts: Omit<OmitResponseType, 'status'>) {
  return ApiEndpoint({ ...opts, responseType: MessageResponseDto });
}

export function ApiHealthEndpoint(opts: Omit<OmitResponseType, 'status'>) {
  return ApiEndpoint({ ...opts, responseType: HealthResponseDto });
}
