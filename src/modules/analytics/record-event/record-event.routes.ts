import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppBindings } from '@/types/env';
import { RecordEventController } from './record-event.controller';

export const recordEventRoutes = new OpenAPIHono<AppBindings>();
const controller = new RecordEventController();

recordEventRoutes.post('/v1/events', controller.handle);
