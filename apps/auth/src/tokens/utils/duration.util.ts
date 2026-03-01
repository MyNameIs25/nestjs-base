const UNITS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

export function parseDuration(value: string): number {
  const match = value.match(/^(\d+)([smhdw])$/);
  if (!match) throw new Error(`Invalid duration format: "${value}"`);
  return Number(match[1]) * UNITS[match[2]];
}
