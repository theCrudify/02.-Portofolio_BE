import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;

export interface PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface ApiResponseDto<T> {
  data: T;
  meta?: PaginationMetaDto;
}

export interface ApiErrorDto {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
