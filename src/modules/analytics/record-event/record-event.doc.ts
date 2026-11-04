import { createRoute } from '@hono/zod-openapi';
import { recordEventBodySchema } from './record-event.dto';

export const recordEventRouteDoc = createRoute({
  method: 'post',
  path: '/v1/events',
  tags: ['Public Events & Contact'],
  summary: 'Record anonymous analytics event',
  request: {
    body: { content: { 'application/json': { schema: recordEventBodySchema } } },
  },
  responses: {
    204: { description: 'Event recorded' },
  },
});
