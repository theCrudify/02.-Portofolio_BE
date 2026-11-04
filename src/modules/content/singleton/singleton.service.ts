import { BaseService } from '@/core/base';
import type { AuthUser, Env } from '@/types/env';
import type { SingletonContentRepository } from './singleton.repository';

export class SingletonContentService extends BaseService<SingletonContentRepository> {
  async getDashboard() {
    return this.repo.fetchDashboard();
  }

  async getProfile() {
    return this.repo.fetchProfile();
  }

  async updateProfile(env: Env, user: AuthUser, payload: Record<string, unknown>) {
    return this.repo.saveProfile(env, user, payload);
  }

  async getSettings() {
    return this.repo.fetchSettings();
  }

  async updateSettings(env: Env, user: AuthUser, payload: Record<string, unknown>) {
    return this.repo.saveSettings(env, user, payload);
  }
}
