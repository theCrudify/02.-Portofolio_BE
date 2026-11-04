import { BaseRepository } from '@/core/base';
import {
  getAdminDashboardSummary,
  getAdminProfile,
  getAdminSiteSettings,
  updateAdminProfile,
  updateAdminSiteSettings,
} from '@/services/content.service';
import type { AuthUser, Env } from '@/types/env';

export class SingletonContentRepository extends BaseRepository {
  async fetchDashboard() {
    return getAdminDashboardSummary(this.db);
  }

  async fetchProfile() {
    return getAdminProfile(this.db);
  }

  async saveProfile(env: Env, user: AuthUser, payload: Record<string, unknown>) {
    return updateAdminProfile(this.db, env, user, payload);
  }

  async fetchSettings() {
    return getAdminSiteSettings(this.db);
  }

  async saveSettings(env: Env, user: AuthUser, payload: Record<string, unknown>) {
    return updateAdminSiteSettings(this.db, env, user, payload);
  }
}
