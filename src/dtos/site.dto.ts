import { z } from 'zod';
import type {
  PublicProjectCard,
  PublicTechChip,
  toAchievement,
  toActivity,
  toCertification,
  toEducation,
  toExperience,
  toPublication,
  toPublicProfile,
  toPublicSettings,
  toTestimonial,
} from '@/services/serializers';

export const getSiteQuerySchema = z.object({
  locale: z.string().optional(),
});

export type GetSiteQueryDto = z.infer<typeof getSiteQuerySchema>;

export interface SiteStatsDto {
  yearsExperience: number;
  projectCount: number;
  certificationCount: number;
}

export interface SiteGithubDto {
  followers: number;
  publicRepos: number;
  stars: number;
}

export interface SiteResponseDto {
  profile: ReturnType<typeof toPublicProfile>;
  settings: ReturnType<typeof toPublicSettings>;
  technologies: Record<
    'frontend' | 'backend' | 'database' | 'devops' | 'tools' | 'soft_skill',
    PublicTechChip[]
  >;
  featuredProjects: PublicProjectCard[];
  experiences: ReturnType<typeof toExperience>[];
  education: ReturnType<typeof toEducation>[];
  certifications: ReturnType<typeof toCertification>[];
  activities: ReturnType<typeof toActivity>[];
  achievements: ReturnType<typeof toAchievement>[];
  publications: ReturnType<typeof toPublication>[];
  testimonials: ReturnType<typeof toTestimonial>[];
  github: unknown;
  stats: SiteStatsDto;
}
