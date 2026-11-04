import type { DbClient } from '@/db/client';
import { BaseService } from '@/core/base';
import type { ListDocumentsQueryDto } from './list.dto';
import { ListDocumentsRepository } from './list.repository';

export class ListDocumentsService extends BaseService {
  protected override readonly repo: ListDocumentsRepository;

  constructor(db: DbClient) {
    super(db);
    this.repo = new ListDocumentsRepository(db);
  }

  async executeDocuments(query: ListDocumentsQueryDto) {
    return this.repo.listDocuments(query);
  }

  async executePresets(query: ListDocumentsQueryDto) {
    return this.repo.listPresets(query);
  }

  async executeShareLinks(query: ListDocumentsQueryDto) {
    return this.repo.listShareLinks(query);
  }
}
