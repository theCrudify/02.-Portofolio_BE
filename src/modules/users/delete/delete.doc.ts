import { createRoute } from '@hono/zod-openapi';
import { deleteUserParamDto } from './delete.dto';

export const deleteUserDoc = createRoute({
  method: 'delete',
  path: '/:id',
  tags: ['Admin Users'],
  summary: 'Delete user account',
  request: {
    params: deleteUserParamDto,
  },
  responses: {
    204: { description: 'User deleted' },
  },
});
