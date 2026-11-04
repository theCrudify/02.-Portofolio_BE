import type { Context, Env as HonoEnv } from 'hono';
import type { z } from 'zod';
import type { ICacheService } from '@/core/cache/cache.interface';
import { defaultCacheService } from '@/core/cache/memory-cache.service';
import type { DbClient } from '@/db/client';
import { getDb } from '@/db/client';
import { AppError } from '@/lib/errors';
import { fail, ok, type ErrorCode, type PaginationMeta } from '@/lib/response';
import type { AppEnv, AuthUser, Bindings } from '@/types/env';

/**
 * BaseRepository: Abstract OOP data access layer holding the Drizzle DbClient.
 */
export abstract class BaseRepository {
  constructor(public readonly db: DbClient) {}
}

/**
 * BaseService: Abstract OOP business logic layer with cache support.
 * Supports passing either a Repository instance or a DbClient.
 */
export abstract class BaseService<TRepo extends BaseRepository = BaseRepository> {
  protected readonly repo!: TRepo;
  protected readonly cache: ICacheService;

  constructor(
    repoOrDb?: TRepo | DbClient,
    cache: ICacheService = defaultCacheService,
  ) {
    if (repoOrDb && 'db' in repoOrDb) {
      this.repo = repoOrDb as TRepo;
    }
    this.cache = cache;
  }
}

/**
 * BaseController: Abstract OOP HTTP controller providing typed helpers for Hono Context.
 */
export abstract class BaseController {
  protected db<E extends HonoEnv = AppEnv>(c: Context<E>): DbClient {
    return getDb((c as unknown as Context<AppEnv>).env);
  }

  protected getDb<E extends HonoEnv = AppEnv>(c: Context<E>): DbClient {
    return getDb((c as unknown as Context<AppEnv>).env);
  }

  protected env<E extends HonoEnv = AppEnv>(c: Context<E>): Bindings {
    return (c as unknown as Context<AppEnv>).env;
  }

  protected user<E extends HonoEnv = AppEnv>(c: Context<E>): AuthUser {
    return (c as unknown as Context<AppEnv>).get('user')!;
  }

  protected parseQuery<TSchema extends z.ZodTypeAny, E extends HonoEnv = AppEnv>(
    c: Context<E>,
    schema: TSchema,
  ): z.infer<TSchema> {
    const raw = c.req.query();
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid query parameters',
        parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }
    return parsed.data;
  }

  protected async parseBody<TSchema extends z.ZodTypeAny, E extends HonoEnv = AppEnv>(
    c: Context<E>,
    schema: TSchema,
    errorMessage = 'Invalid request payload',
  ): Promise<z.infer<TSchema>> {
    const body = await c.req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        errorMessage,
        parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      );
    }
    return parsed.data;
  }

  protected ok<T, E extends HonoEnv = AppEnv>(
    c: Context<E>,
    data: T,
    meta?: PaginationMeta | Record<string, unknown>,
    status: 200 | 201 = 200,
  ) {
    return ok(c as unknown as Context<AppEnv>, data, meta as PaginationMeta | undefined, status);
  }

  protected success<T, E extends HonoEnv = AppEnv>(
    c: Context<E>,
    data: T,
    meta?: PaginationMeta | Record<string, unknown>,
  ) {
    return ok(c as unknown as Context<AppEnv>, data, meta as PaginationMeta | undefined, 200);
  }

  protected created<T, E extends HonoEnv = AppEnv>(
    c: Context<E>,
    data: T,
    meta?: PaginationMeta | Record<string, unknown>,
  ) {
    return ok(c as unknown as Context<AppEnv>, data, meta as PaginationMeta | undefined, 201);
  }

  protected noContent<E extends HonoEnv = AppEnv>(c: Context<E>) {
    return c.body(null, 204);
  }

  protected fail<E extends HonoEnv = AppEnv>(
    c: Context<E>,
    status: 400 | 401 | 403 | 404 | 409 | 410 | 413 | 422 | 429 | 500,
    code: ErrorCode,
    message: string,
  ) {
    return fail(c as unknown as Context<AppEnv>, status, code, message);
  }
}
