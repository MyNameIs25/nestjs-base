export const THROTTLE_PRESETS = {
  /** Register — strictest limit */
  STRICT: {
    short: { ttl: 60_000, limit: 3 },
    long: { ttl: 600_000, limit: 10 },
  },
  /** Login — moderate limit */
  DEFAULT: {
    short: { ttl: 60_000, limit: 5 },
    long: { ttl: 600_000, limit: 20 },
  },
  /** Refresh — relaxed limit */
  RELAXED: {
    short: { ttl: 60_000, limit: 10 },
    long: { ttl: 600_000, limit: 30 },
  },
} as const;
