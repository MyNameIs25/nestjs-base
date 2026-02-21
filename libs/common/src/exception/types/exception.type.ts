export type ErrorSource = 'A' | 'B' | 'C';

export interface ErrorDomainConfig {
  domain: string;
}

export interface ErrorCodeInput {
  source: ErrorSource;
  seq: number;
  httpStatus?: number;
  message: string;
}

export interface ErrorCodeDef {
  readonly code: string;
  readonly httpStatus: number;
  readonly message: string;
}

export interface ResolvedError {
  errorCode: ErrorCodeDef;
  message: string;
  devMessage?: string;
  status: number;
}

export interface ErrorResponseBody {
  success: false;
  code: string;
  message: string;
  devMessage?: string;
  timestamp: string;
  traceId: string;
}
