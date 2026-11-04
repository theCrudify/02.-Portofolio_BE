export type SupportedLocale = 'en' | 'id';

export function parseLocale(input?: string | null): SupportedLocale {
  if (input === 'id') {
    return 'id';
  }
  return 'en';
}

export function pickLocale<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: SupportedLocale,
): string | null {
  const enKey = `${field}En`;
  const idKey = `${field}Id`;
  const snakeEnKey = `${field}_en`;
  const snakeIdKey = `${field}_id`;

  if (locale === 'id') {
    const idVal = row[idKey] ?? row[snakeIdKey];
    if (typeof idVal === 'string' && idVal.trim().length > 0) {
      return idVal;
    }
  }

  const enVal = row[enKey] ?? row[snakeEnKey];
  if (typeof enVal === 'string') {
    return enVal;
  }
  return null;
}

