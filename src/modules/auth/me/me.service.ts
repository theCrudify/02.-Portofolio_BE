import { BaseService } from '@/core/base';
import type { AuthUser } from '@/types/env';
import type { MeResponseDto } from './me.dto';
import type { MeRepository } from './me.repository';

export class MeService extends BaseService<MeRepository> {
  getProfile(user: AuthUser): MeResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      totpEnabled: user.totpEnabled,
      mustEnable2fa: user.role === 'owner' && !user.totpEnabled,
    };
  }
}
