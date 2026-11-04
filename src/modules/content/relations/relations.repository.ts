import { BaseRepository } from '@/core/base';
import {
  replaceProjectTechnologies,
  replaceProjectLinks,
  replaceProjectMedia,
  replaceExperienceTechnologies,
} from '@/services/content.service';
import type { AuthUser, Env } from '@/types/env';

export class RelationsContentRepository extends BaseRepository {
  async setProjectTechnologies(
    env: Env,
    user: AuthUser,
    projectId: string,
    items: Parameters<typeof replaceProjectTechnologies>[4],
  ) {
    await replaceProjectTechnologies(this.db, env, user, projectId, items);
  }

  async setProjectLinks(
    env: Env,
    user: AuthUser,
    projectId: string,
    items: Parameters<typeof replaceProjectLinks>[4],
  ) {
    await replaceProjectLinks(this.db, env, user, projectId, items);
  }

  async setProjectMedia(
    env: Env,
    user: AuthUser,
    projectId: string,
    items: Parameters<typeof replaceProjectMedia>[4],
  ) {
    await replaceProjectMedia(this.db, env, user, projectId, items);
  }

  async setExperienceTechnologies(
    env: Env,
    user: AuthUser,
    experienceId: string,
    technologyIds: string[],
  ) {
    await replaceExperienceTechnologies(this.db, env, user, experienceId, technologyIds);
  }
}
