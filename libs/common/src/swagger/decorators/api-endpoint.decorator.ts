import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { ApiResponseOptions } from '@nestjs/swagger';
import { ErrorResponseDto } from '../schemas/envelope.schema';

type ErrorConfig = Record<number, string>;

const ERROR_DECORATOR_MAP: Record<
  number,
  (opts: ApiResponseOptions) => MethodDecorator & ClassDecorator
> = {
  400: ApiBadRequestResponse,
  401: ApiUnauthorizedResponse,
  403: ApiForbiddenResponse,
  409: ApiConflictResponse,
  429: ApiTooManyRequestsResponse,
};

function apiErrorDecorators(errors: ErrorConfig) {
  return Object.entries(errors).map(([status, description]) => {
    const factory = ERROR_DECORATOR_MAP[Number(status)];
    return factory({ description, type: ErrorResponseDto });
  });
}

export interface ApiEndpointOptions {
  summary: string;
  responseType: Type;
  status?: 200 | 201;
  errors?: ErrorConfig;
}

export function ApiEndpoint({
  summary,
  responseType,
  status = 200,
  errors = {},
}: ApiEndpointOptions) {
  const successDecorator =
    status === 201
      ? ApiCreatedResponse({ description: summary, type: responseType })
      : ApiOkResponse({ description: summary, type: responseType });

  return applyDecorators(
    ApiOperation({ summary }),
    successDecorator,
    ...apiErrorDecorators(errors),
  );
}
