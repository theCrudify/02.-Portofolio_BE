export type UserRole = 'owner' | 'editor' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tokenVersion: number;
  totpEnabled: boolean;
}

export interface Bindings {
  DATABASE_URL: string;
  JWT_SECRET: string;
  HASH_SALT: string;
  FRONTEND_URL: string;
  REVALIDATE_SECRET: string;
  TURNSTILE_SECRET: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  RESEND_API_KEY: string;
  CONTACT_TO_EMAIL: string;
  SENTRY_DSN?: string;
  GITHUB_TOKEN?: string;
  GITHUB_USERNAME?: string;
}

export interface Variables {
  requestId: string;
  user?: AuthUser;
}

export interface AppEnv {
  Bindings: Bindings;
  Variables: Variables;
}

export type Env = Bindings;
export type AppBindings = AppEnv;

