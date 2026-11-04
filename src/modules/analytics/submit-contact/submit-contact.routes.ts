import { OpenAPIHono } from '@hono/zod-openapi';
import type { AppBindings } from '@/types/env';
import { SubmitContactController } from './submit-contact.controller';

export const submitContactRoutes = new OpenAPIHono<AppBindings>();
const controller = new SubmitContactController();

submitContactRoutes.post('/v1/contact', controller.handle);
