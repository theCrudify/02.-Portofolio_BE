import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { ApiError } from '@/lib/errors';
import type { AppEnv } from '@/types/env';
import {
  experienceTechnologiesSchema,
  projectLinksSchema,
  projectMediaSchema,
  projectTechnologiesSchema,
} from './relations.dto';
import { RelationsContentRepository } from './relations.repository';
import { RelationsContentService } from './relations.service';

export class RelationsContentController extends BaseController {
  async handleProjectTechnologies(c: Context<AppEnv>) {
    const id = c.req.param('id')!;
    const parsed = projectTechnologiesSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid project technologies payload');
    }
    const service = new RelationsContentService(new RelationsContentRepository(this.db(c)));
    await service.updateProjectTechnologies(c.env, this.user(c), id, parsed.data.items);
    return this.ok(c, { updated: true });
  }

  async handleProjectLinks(c: Context<AppEnv>) {
    const id = c.req.param('id')!;
    const parsed = projectLinksSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid project links payload');
    }
    const service = new RelationsContentService(new RelationsContentRepository(this.db(c)));
    await service.updateProjectLinks(c.env, this.user(c), id, parsed.data.items);
    return this.ok(c, { updated: true });
  }

  async handleProjectMedia(c: Context<AppEnv>) {
    const id = c.req.param('id')!;
    const parsed = projectMediaSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid project media payload');
    }
    const service = new RelationsContentService(new RelationsContentRepository(this.db(c)));
    await service.updateProjectMedia(c.env, this.user(c), id, parsed.data.items);
    return this.ok(c, { updated: true });
  }

  async handleExperienceTechnologies(c: Context<AppEnv>) {
    const id = c.req.param('id')!;
    const parsed = experienceTechnologiesSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid experience technologies payload');
    }
    const service = new RelationsContentService(new RelationsContentRepository(this.db(c)));
    await service.updateExperienceTechnologies(c.env, this.user(c), id, parsed.data.technologyIds);
    return this.ok(c, { updated: true });
  }
}
