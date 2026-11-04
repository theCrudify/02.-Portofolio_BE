import { BaseService } from '@/core/base';
import type { AuthUser, Env } from '@/types/env';
import type { RelationsContentRepository } from './relations.repository';

export class RelationsContentService extends BaseService<RelationsContentRepository> {
  async updateProjectTechnologies(
    env: Env,
    user: AuthUser,
    projectId: string,
    items: Parameters<RelationsContentRepository['setProjectTechnologies']>[3],
  ) {
    await this.repo.setProjectTechnologies(env, user, projectId, items);
  }

  async updateProjectLinks(
    env: Env,
    user: AuthUser,
    projectId: string,
    items: Parameters<RelationsContentRepository['setProjectLinks']>[3],
  ) {
    await this.repo.setProjectLinks(env, user, projectId, items);
  }

  async updateProjectMedia(
    env: Env,
    user: AuthUser,
    projectId: string,
    items: Parameters<RelationsContentRepository['setProjectMedia']>[3],
  ) {
    await this.repo.setProjectMedia(env, user, projectId, items);
  }

  async updateExperienceTechnologies(
    env: Env,
    user: AuthUser,
    experienceId: string,
    technologyIds: string[],
  ) {
    await this.repo.setExperienceTechnologies(env, user, experienceId, technologyIds);
  }
}
