import type { DbClient } from '@/db/client';

export interface IBaseRepository {
  readonly db: DbClient;
}

export abstract class BaseRepository implements IBaseRepository {
  constructor(public readonly db: DbClient) {}
}

