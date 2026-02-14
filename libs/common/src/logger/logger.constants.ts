export const LOG_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;

export const DEFAULT_LOG_LEVEL = 'info';
export const DEFAULT_LOG_RETENTION_DAYS = 7;

export const DEFAULT_REDACT_PATHS = [
  '*.password',
  '*.newPassword',
  '*.oldPassword',
  '*.cardNumber',
  '*.cvv',
  '*.ssn',
  '*.token',
  '*.refreshToken',
  '*.accessToken',
  '*.secret',
  '*.authorization',
  'req.headers.authorization',
  'req.headers.cookie',
];
