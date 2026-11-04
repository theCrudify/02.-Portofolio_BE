import { z } from 'zod';
import type { PublicProjectCard, toProjectDetail } from '@/services/serializers';
import type { PaginationMetaDto } from './common.dto';

export type ProjectType = 'personal' | 'freelance' | 'company' | 'open_source' | 'hackathon';

export interface ListProjectsFilterDto {
  locale: 'en' | 'id';
  technology?: string;
  type?: ProjectType;
  page?: number;
  limit?: number;
}

export interface PaginatedProjectsDto {
  items: PublicProjectCard[];
  meta: PaginationMetaDto;
}

export type ProjectDetailDto = ReturnType<typeof toProjectDetail>;

export const createProjectSchema = z.object({
  slug: z.string().min(1).max(80),
  title: z.record(z.string()),
  summary: z.record(z.string()).optional(),
  description: z.record(z.string()).optional(),
  type: z.enum(['personal', 'freelance', 'company', 'open_source', 'hackathon']),
  technologyIds: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  coverImageId: z.string().optional().nullable(),
});

export type CreateProjectDto = z.infer<typeof createProjectSchema>;
