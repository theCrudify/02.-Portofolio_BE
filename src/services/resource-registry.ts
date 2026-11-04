import type { ZodTypeAny } from 'zod';
import {
  projects,
  technologies,
  experiences,
  education,
  certifications,
  activities,
  achievements,
  publications,
  testimonials,
} from '../db/schema';
import {
  projectCreateSchema,
  projectUpdateSchema,
  technologySchema,
  experienceSchema,
  educationSchema,
  certificationSchema,
  activitySchema,
  achievementSchema,
  publicationSchema,
  testimonialSchema,
} from '../validators/content';

export type ResourceName =
  | 'projects'
  | 'technologies'
  | 'experiences'
  | 'education'
  | 'certifications'
  | 'activities'
  | 'achievements'
  | 'publications'
  | 'testimonials';

export interface ResourceConfig {
  name: ResourceName;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any;
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  revalidateTags: (item?: Record<string, unknown>) => string[];
  hasSlug?: boolean;
}

export const RESOURCE_REGISTRY: Record<ResourceName, ResourceConfig> = {
  projects: {
    name: 'projects',
    table: projects,
    createSchema: projectCreateSchema,
    updateSchema: projectUpdateSchema,
    hasSlug: true,
    revalidateTags: (item) => {
      const tags = ['site', 'projects'];
      if (item && typeof item.slug === 'string') {
        tags.push(`project:${item.slug}`);
      }
      return tags;
    },
  },
  technologies: {
    name: 'technologies',
    table: technologies,
    createSchema: technologySchema,
    updateSchema: technologySchema,
    hasSlug: true,
    revalidateTags: () => ['site', 'projects'],
  },
  experiences: {
    name: 'experiences',
    table: experiences,
    createSchema: experienceSchema,
    updateSchema: experienceSchema,
    revalidateTags: () => ['site'],
  },
  education: {
    name: 'education',
    table: education,
    createSchema: educationSchema,
    updateSchema: educationSchema,
    revalidateTags: () => ['site'],
  },
  certifications: {
    name: 'certifications',
    table: certifications,
    createSchema: certificationSchema,
    updateSchema: certificationSchema,
    revalidateTags: () => ['site', 'certifications'],
  },
  activities: {
    name: 'activities',
    table: activities,
    createSchema: activitySchema,
    updateSchema: activitySchema,
    revalidateTags: () => ['site'],
  },
  achievements: {
    name: 'achievements',
    table: achievements,
    createSchema: achievementSchema,
    updateSchema: achievementSchema,
    revalidateTags: () => ['site'],
  },
  publications: {
    name: 'publications',
    table: publications,
    createSchema: publicationSchema,
    updateSchema: publicationSchema,
    revalidateTags: () => ['site'],
  },
  testimonials: {
    name: 'testimonials',
    table: testimonials,
    createSchema: testimonialSchema,
    updateSchema: testimonialSchema,
    revalidateTags: () => ['site'],
  },
};

export function getResourceConfig(name: string): ResourceConfig | null {
  if (name in RESOURCE_REGISTRY) {
    return RESOURCE_REGISTRY[name as ResourceName];
  }
  return null;
}
