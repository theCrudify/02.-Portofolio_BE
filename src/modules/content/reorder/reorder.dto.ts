import { reorderSchema } from '@/validators/content';
import { ApiError } from '@/lib/errors';

export { reorderSchema };

export function parseReorderDto(body: unknown): { ids: string[] } {
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid reorder payload');
  }
  return parsed.data;
}
