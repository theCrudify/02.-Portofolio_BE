import { createRoute, z } from '@hono/zod-openapi';
import { submitContactBodySchema } from './submit-contact.dto';

export const submitContactRouteDoc = createRoute({
  method: 'post',
  path: '/v1/contact',
  tags: ['Public Events & Contact'],
  summary: 'Submit contact message',
  request: {
    body: { content: { 'application/json': { schema: submitContactBodySchema } } },
  },
  responses: {
    201: {
      description: 'Contact message received',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
