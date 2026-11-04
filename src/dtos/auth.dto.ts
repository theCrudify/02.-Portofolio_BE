import { z } from 'zod';
import {
  changePasswordBodySchema,
  disable2faBodySchema,
  enable2faBodySchema,
  loginBodySchema,
  verify2faBodySchema,
} from '@/validators/auth';

export type LoginDto = z.infer<typeof loginBodySchema>;
export type Verify2FADto = z.infer<typeof verify2faBodySchema>;
export type Enable2FADto = z.infer<typeof enable2faBodySchema>;
export type Disable2FADto = z.infer<typeof disable2faBodySchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordBodySchema>;

export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  twoFactorEnabled: boolean;
}

export interface LoginResponseDto {
  require2fa?: boolean;
  tempToken?: string;
  user?: AuthUserDto;
}
