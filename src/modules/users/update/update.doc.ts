import { createRoute, z } from '@hono/zod-openapi';
import { updateUserBodyDto, updateUserParamDto } from './update.dto';

export const updateUserDoc = createRoute({
  method: 'put',
  path: '/:id',
  tags: ['Admin Users'],
  summary: 'Update user name, role, or active status',
  request: {
    params: updateUserParamDto,
    body: {
      content: {
        'application/json': { schema: updateUserBodyDto },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated user',
      content: { 'application/json': { schema: z.object({ data: z.unknown() }) } },
    },
  },
});
