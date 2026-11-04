import { createRoute, z } from '@hono/zod-openapi';
import { createUserBodyDto } from './create.dto';

export const createUserDoc = createRoute({
  method: 'post',
  path: '/',
  tags: ['Admin Users'],
  summary: 'Create a new admin/editor/viewer user account',
  request: {
    body: {
      content: {
        'application/json': { schema: createUserBodyDto },
      },
    },
  },
  responses: {
    201: {
      description: 'Created user and initial password',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
