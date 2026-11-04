import type { Context } from 'hono';
import { BaseController } from '@/core/base';
import { ApiError } from '@/lib/errors';
import type { AppEnv } from '@/types/env';
import { profileUpdateSchema, siteSettingsUpdateSchema } from './singleton.dto';
import { SingletonContentRepository } from './singleton.repository';
import { SingletonContentService } from './singleton.service';

export class SingletonContentController extends BaseController {
  async handleGetDashboard(c: Context<AppEnv>) {
    const service = new SingletonContentService(new SingletonContentRepository(this.db(c)));
    return this.ok(c, await service.getDashboard());
  }

  async handleGetProfile(c: Context<AppEnv>) {
    const service = new SingletonContentService(new SingletonContentRepository(this.db(c)));
    return this.ok(c, await service.getProfile());
  }

  async handleUpdateProfile(c: Context<AppEnv>) {
    const parsed = profileUpdateSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Invalid profile payload',
        parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }
    const service = new SingletonContentService(new SingletonContentRepository(this.db(c)));
    const updated = await service.updateProfile(c.env, this.user(c), parsed.data);
    return this.ok(c, updated);
  }

  async handleGetSettings(c: Context<AppEnv>) {
    const service = new SingletonContentService(new SingletonContentRepository(this.db(c)));
    return this.ok(c, await service.getSettings());
  }

  async handleUpdateSettings(c: Context<AppEnv>) {
    const parsed = siteSettingsUpdateSchema.safeParse(await c.req.json());
    if (!parsed.success) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'Invalid site settings payload',
        parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }
    const service = new SingletonContentService(new SingletonContentRepository(this.db(c)));
    const updated = await service.updateSettings(c.env, this.user(c), parsed.data);
    return this.ok(c, updated);
  }
}
