import { BaseService } from '@/core/base';
import type { ListUsersQueryDto, UserListItemDto } from './list.dto';
import type { ListUsersRepository } from './list.repository';

export class ListUsersService extends BaseService<ListUsersRepository> {
  async execute(query: Partial<ListUsersQueryDto> = {}) {
    const { rows, meta } = await this.repo.findUsers(query);
    const items: UserListItemDto[] = rows.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      totpEnabled: u.totpEnabled,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
      createdAt: new Date(u.createdAt).toISOString(),
    }));
    return { items, meta };
  }
}
