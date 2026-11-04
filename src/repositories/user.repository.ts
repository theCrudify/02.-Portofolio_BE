import { eq } from 'drizzle-orm';
import type { DbClient } from '@/db/client';
import * as schema from '@/db/schema';
import { BaseRepository } from './base.repository';

export interface IUserRepository {
  findByEmail(email: string): Promise<typeof schema.users.$inferSelect | null>;
  findById(id: string): Promise<typeof schema.users.$inferSelect | null>;
  findAll(): Promise<(typeof schema.users.$inferSelect)[]>;
  create(data: typeof schema.users.$inferInsert): Promise<typeof schema.users.$inferSelect>;
  update(id: string, data: Partial<typeof schema.users.$inferInsert>): Promise<void>;
  delete(id: string): Promise<void>;
  writeAuditLog(input: {
    userId: string | null;
    action: (typeof schema.auditAction.enumValues)[number];
    resource: string;
    resourceId?: string | null;
    summary?: string;
  }): Promise<void>;
}

export class DrizzleUserRepository extends BaseRepository implements IUserRepository {
  constructor(db: DbClient) {
    super(db);
  }

  async findByEmail(email: string) {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase().trim()))
      .limit(1);
    return rows[0] ?? null;
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async findAll() {
    return this.db.select().from(schema.users);
  }

  async create(data: typeof schema.users.$inferInsert) {
    const rows = await this.db.insert(schema.users).values(data).returning();
    const created = rows[0];
    if (!created) {
      throw new Error('Failed to create user');
    }
    return created;
  }

  async update(id: string, data: Partial<typeof schema.users.$inferInsert>) {
    await this.db
      .update(schema.users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.users.id, id));
  }

  async delete(id: string) {
    await this.db.delete(schema.users).where(eq(schema.users.id, id));
  }

  async writeAuditLog(input: {
    userId: string | null;
    action: (typeof schema.auditAction.enumValues)[number];
    resource: string;
    resourceId?: string | null;
    summary?: string;
  }): Promise<void> {
    await this.db.insert(schema.auditLogs).values({
      userId: input.userId,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      summary: input.summary ?? null,
    });
  }
}
