import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppEnv } from '@/types/env';
import { HealthController } from './health.controller';
import { healthRouteDoc } from './health.doc';

export const healthRoutes = new OpenAPIHono<AppEnv>();
const controller = new HealthController();

healthRoutes.openapi(healthRouteDoc, controller.handle);
