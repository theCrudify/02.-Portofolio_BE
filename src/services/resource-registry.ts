import type { ZodTypeAny } from 'zod';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { LookupGroupCode } from '../db/queries/lookups';
import {
  achievements,
  activities,
  activityAchievements,
  certifications,
  education,
  educationActivities,
  experienceAchievements,
  experienceProjects,
  experienceResponsibilities,
  experiences,
  experienceTechnologies,
  organizations,
  projectHighlights,
  projectLinks,
  projectMedia,
  projectMetrics,
  projectResponsibilities,
  projects,
  projectTechnologies,
  publications,
  technologies,
  testimonials,
} from '../db/schema';
import {
  achievementSchema,
  activitySchema,
  certificationSchema,
  educationSchema,
  experienceSchema,
  organizationSchema,
  projectCreateSchema,
  projectUpdateSchema,
  publicationSchema,
  technologySchema,
  testimonialSchema,
  updateSchemas,
} from '../validators/content';

export type ResourceName =
  | 'projects'
  | 'technologies'
  | 'organizations'
  | 'experiences'
  | 'education'
  | 'certifications'
  | 'activities'
  | 'achievements'
  | 'publications'
  | 'testimonials';

/** A child collection written together with its parent (replace-all on save). */
export interface ChildSpec {
  /** Key in the admin payload and in the detail response. */
  key: string;
  table: PgTable;
  /** Drizzle property of the child's FK to the parent. */
  parentKey: string;
  /** Columns copied from each payload item (sortOrder is set from the array position). */
  fields: string[];
  /** Whether the table has a sort_order column. */
  sorted: boolean;
  /** Lookup-id fields inside each item and the group they must belong to. */
  lookupFields?: Record<string, LookupGroupCode>;
}

export interface ResourceConfig {
  name: ResourceName;
  // Each registered table differs; the generic CRUD only touches the shared content columns.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any;
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  revalidateTags: (item?: Record<string, unknown>) => string[];
  hasSlug?: boolean;
  /** Lookup-id columns on the parent row and their group. */
  lookupFields?: Record<string, LookupGroupCode>;
  children?: ChildSpec[];
  /** Searched by the admin list (`?q=`). */
  searchKeys: string[];
}

const bullets = (key: string, table: PgTable, parentKey: string): ChildSpec => ({
  key,
  table,
  parentKey,
  fields: ['textEn', 'textId'],
  sorted: true,
});

export const RESOURCE_REGISTRY: Record<ResourceName, ResourceConfig> = {
  projects: {
    name: 'projects',
    table: projects,
    createSchema: projectCreateSchema,
    updateSchema: projectUpdateSchema,
    hasSlug: true,
    lookupFields: { typeId: 'project_type', stateId: 'project_state' },
    children: [
      bullets('responsibilities', projectResponsibilities, 'projectId'),
      bullets('highlights', projectHighlights, 'projectId'),
      {
        key: 'metrics',
        table: projectMetrics,
        parentKey: 'projectId',
        fields: ['labelEn', 'labelId', 'value'],
        sorted: true,
      },
      {
        key: 'technologies',
        table: projectTechnologies,
        parentKey: 'projectId',
        fields: ['technologyId', 'groupId'],
        sorted: true,
        lookupFields: { groupId: 'tech_group' },
      },
      {
        key: 'links',
        table: projectLinks,
        parentKey: 'projectId',
        fields: ['typeId', 'label', 'url', 'isPrivate'],
        sorted: true,
        lookupFields: { typeId: 'link_type' },
      },
      {
        key: 'media',
        table: projectMedia,
        parentKey: 'projectId',
        fields: ['mediaId', 'roleId', 'captionEn', 'captionId'],
        sorted: true,
        lookupFields: { roleId: 'project_media_role' },
      },
      {
        key: 'experiences',
        table: experienceProjects,
        parentKey: 'projectId',
        fields: ['experienceId'],
        sorted: true,
      },
    ],
    searchKeys: ['slug', 'titleEn', 'titleId', 'summaryEn', 'summaryId'],
    revalidateTags: (item) => {
      const tags = ['site', 'projects'];
      if (item && typeof item.slug === 'string') tags.push(`project:${item.slug}`);
      return tags;
    },
  },
  technologies: {
    name: 'technologies',
    table: technologies,
    createSchema: technologySchema,
    updateSchema: updateSchemas.technologies,
    hasSlug: true,
    lookupFields: { categoryId: 'tech_category' },
    searchKeys: ['name', 'slug'],
    revalidateTags: () => ['site', 'projects'],
  },
  organizations: {
    name: 'organizations',
    table: organizations,
    createSchema: organizationSchema,
    updateSchema: updateSchemas.organizations,
    hasSlug: true,
    lookupFields: { typeId: 'organization_type' },
    searchKeys: ['name', 'slug', 'location'],
    // Organisations appear on every page (experience, education, certificates, projects).
    revalidateTags: () => ['site', 'projects', 'certifications'],
  },
  experiences: {
    name: 'experiences',
    table: experiences,
    createSchema: experienceSchema,
    updateSchema: updateSchemas.experiences,
    lookupFields: { employmentTypeId: 'employment_type', workModeId: 'work_mode' },
    children: [
      bullets('responsibilities', experienceResponsibilities, 'experienceId'),
      bullets('achievements', experienceAchievements, 'experienceId'),
      {
        key: 'technologies',
        table: experienceTechnologies,
        parentKey: 'experienceId',
        fields: ['technologyId'],
        sorted: false,
      },
      {
        key: 'projects',
        table: experienceProjects,
        parentKey: 'experienceId',
        fields: ['projectId'],
        sorted: true,
      },
    ],
    searchKeys: ['roleEn', 'roleId', 'location'],
    revalidateTags: () => ['site', 'projects'],
  },
  education: {
    name: 'education',
    table: education,
    createSchema: educationSchema,
    updateSchema: updateSchemas.education,
    children: [bullets('activities', educationActivities, 'educationId')],
    searchKeys: ['degree', 'fieldEn', 'fieldId'],
    revalidateTags: () => ['site'],
  },
  certifications: {
    name: 'certifications',
    table: certifications,
    createSchema: certificationSchema,
    updateSchema: updateSchemas.certifications,
    lookupFields: { typeId: 'cert_type' },
    searchKeys: ['name', 'credentialId'],
    revalidateTags: () => ['site', 'certifications'],
  },
  activities: {
    name: 'activities',
    table: activities,
    createSchema: activitySchema,
    updateSchema: updateSchemas.activities,
    lookupFields: { typeId: 'activity_type' },
    children: [bullets('achievements', activityAchievements, 'activityId')],
    searchKeys: ['roleEn', 'roleId', 'eventName'],
    revalidateTags: () => ['site'],
  },
  achievements: {
    name: 'achievements',
    table: achievements,
    createSchema: achievementSchema,
    updateSchema: updateSchemas.achievements,
    searchKeys: ['titleEn', 'titleId', 'eventName', 'rank'],
    revalidateTags: () => ['site'],
  },
  publications: {
    name: 'publications',
    table: publications,
    createSchema: publicationSchema,
    updateSchema: updateSchemas.publications,
    lookupFields: { typeId: 'publication_type' },
    searchKeys: ['title', 'venue'],
    revalidateTags: () => ['site'],
  },
  testimonials: {
    name: 'testimonials',
    table: testimonials,
    createSchema: testimonialSchema,
    updateSchema: updateSchemas.testimonials,
    searchKeys: ['name', 'position', 'quoteEn'],
    revalidateTags: () => ['site'],
  },
};

export function getResourceConfig(name: string): ResourceConfig | null {
  return name in RESOURCE_REGISTRY ? RESOURCE_REGISTRY[name as ResourceName] : null;
}
