import { and, asc, eq, inArray } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import { publishedOnly } from '@/db/queries/common';
import * as schema from '@/db/schema';
import type { BulletRow, TechnologyRow } from '@/services/serializers';

/** Achievements, tools/skills, links and attachments of certificates or activities. */
export interface RawExtras {
  achievements: (BulletRow & { parentId: string })[];
  technologies: { parentId: string; sortOrder: number; tech: TechnologyRow }[];
  links: (typeof schema.certificationLinks.$inferSelect)[];
  media: (typeof schema.certificationMedia.$inferSelect)[];
}

export const EMPTY_EXTRAS: RawExtras = { achievements: [], technologies: [], links: [], media: [] };

const TABLES = {
  certification: {
    achievements: schema.certificationAchievements,
    achievementParent: schema.certificationAchievements.certificationId,
    techs: schema.certificationTechnologies,
    links: schema.certificationLinks,
    media: schema.certificationMedia,
  },
  activity: {
    achievements: schema.activityAchievements,
    achievementParent: schema.activityAchievements.activityId,
    techs: schema.activityTechnologies,
    links: schema.activityLinks,
    media: schema.activityMedia,
  },
};

export async function fetchExtras(
  db: DbClient,
  kind: keyof typeof TABLES,
  ids: string[],
): Promise<RawExtras> {
  if (ids.length === 0) return EMPTY_EXTRAS;
  const t = TABLES[kind];
  const [achievements, technologies, links, media] = await Promise.all([
    db
      .select({
        parentId: t.achievementParent,
        textEn: t.achievements.textEn,
        textId: t.achievements.textId,
        sortOrder: t.achievements.sortOrder,
      })
      .from(t.achievements)
      .where(inArray(t.achievementParent, ids)),
    // Only published technologies are shown publicly.
    db
      .select({ parentId: t.techs.parentId, sortOrder: t.techs.sortOrder, tech: schema.technologies })
      .from(t.techs)
      .innerJoin(schema.technologies, eq(schema.technologies.id, t.techs.technologyId))
      .where(and(inArray(t.techs.parentId, ids), publishedOnly(schema.technologies))),
    db.select().from(t.links).where(inArray(t.links.parentId, ids)).orderBy(asc(t.links.sortOrder)),
    db.select().from(t.media).where(inArray(t.media.parentId, ids)).orderBy(asc(t.media.sortOrder)),
  ]);
  return { achievements, technologies, links, media };
}
