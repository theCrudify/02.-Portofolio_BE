import { BaseService } from '@/core/base';
import { signUpload } from '@/lib/cloudinary';
import type { Env } from '@/types/env';
import type { SignMediaBodyDto } from './sign.dto';

export class SignMediaService extends BaseService {
  async execute(env: Env, dto: SignMediaBodyDto) {
    return signUpload(env, dto.kind);
  }
}
