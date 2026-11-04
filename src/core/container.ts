import type { DbClient } from '@/db/client';
import type { ICacheService } from '@/core/cache/cache.interface';
import { defaultCacheService } from '@/core/cache/memory-cache.service';
import { DrizzleSiteRepository, type ISiteRepository } from '@/repositories/site.repository';
import {
  DrizzleProjectRepository,
  type IProjectRepository,
} from '@/repositories/project.repository';
import {
  DrizzleCertificationRepository,
  type ICertificationRepository,
} from '@/repositories/certification.repository';
import { SiteService } from '@/services/site.service';
import { ProjectService } from '@/services/project.service';
import { CertificationService } from '@/services/certification.service';

/**
 * ServiceContainer: Dependency Injection container holding configured
 * repositories, services, and controllers for the application.
 */
export class ServiceContainer {
  public readonly cache: ICacheService;

  // Repositories
  public readonly siteRepository: ISiteRepository;
  public readonly projectRepository: IProjectRepository;
  public readonly certificationRepository: ICertificationRepository;

  // Services
  public readonly siteService: SiteService;
  public readonly projectService: ProjectService;
  public readonly certificationService: CertificationService;


  constructor(db: DbClient, cache: ICacheService = defaultCacheService) {
    this.cache = cache;

    // Repositories
    this.siteRepository = new DrizzleSiteRepository(db);
    this.projectRepository = new DrizzleProjectRepository(db);
    this.certificationRepository = new DrizzleCertificationRepository(db);

    // Services (Injected with Repositories and Cache)
    this.siteService = new SiteService(this.siteRepository, this.cache);
    this.projectService = new ProjectService(this.projectRepository, this.cache);
    this.certificationService = new CertificationService(
      this.certificationRepository,
      this.cache,
    );

  }
}

/**
 * Factory function to instantiate a container given a DbClient.
 */
export function createContainer(
  db: DbClient,
  cache: ICacheService = defaultCacheService,
): ServiceContainer {
  return new ServiceContainer(db, cache);
}

