import type {
  ErrorCodeDef,
  ErrorCodeInput,
  ErrorDomainConfig,
  ErrorSource,
} from '../types/exception.type';

const DOMAIN_PATTERN = /^\d{2}$/;

const DEFAULT_HTTP_STATUS: Record<ErrorSource, number> = {
  A: 400,
  B: 500,
  C: 502,
};

export function defineErrorCodes<T extends Record<string, ErrorCodeInput>>(
  config: ErrorDomainConfig,
  defs: T,
): { [K in keyof T]: ErrorCodeDef } {
  const { domain } = config;

  if (!DOMAIN_PATTERN.test(domain)) {
    throw new Error(
      `Invalid domain "${domain}". Must be a 2-digit string (e.g. "00", "01").`,
    );
  }

  const result = {} as { [K in keyof T]: ErrorCodeDef };
  const seen = new Set<string>();

  for (const [name, def] of Object.entries(defs)) {
    if (!['A', 'B', 'C'].includes(def.source)) {
      throw new Error(
        `Invalid source "${def.source}" for "${name}". Must be "A", "B", or "C".`,
      );
    }

    if (!Number.isInteger(def.seq) || def.seq < 1 || def.seq > 999) {
      throw new Error(
        `Invalid seq ${String(def.seq)} for "${name}". Must be an integer between 1 and 999.`,
      );
    }

    const code = `${def.source}${domain}${def.seq.toString().padStart(3, '0')}`;

    if (seen.has(code)) {
      throw new Error(`Duplicate error code "${code}" found at "${name}".`);
    }
    seen.add(code);

    const entry: ErrorCodeDef = {
      code,
      httpStatus: def.httpStatus ?? DEFAULT_HTTP_STATUS[def.source],
      message: def.message,
    };

    Object.defineProperty(result, name, {
      value: entry,
      enumerable: true,
    });
  }

  return result;
}
