import type { ResourceConfig } from '@/services/resource-registry';
import { ApiError } from '@/lib/errors';

export function validateCreateContentPayload(
  config: ResourceConfig,
  body: unknown,
): Record<string, unknown> {
  const parsed = config.createSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'Validation failed',
      parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return parsed.data as Record<string, unknown>;
}
