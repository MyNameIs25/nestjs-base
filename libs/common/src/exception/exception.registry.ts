export const ERROR_SOURCE = {
  USER: 'A',
  SYSTEM: 'B',
  THIRD_PARTY: 'C',
} as const;

export const ERROR_DOMAINS = {
  COMMON: '00',
  AUTH: '01',
  PAYMENTS: '02',
} as const;
