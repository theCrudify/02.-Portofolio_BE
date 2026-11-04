import { z } from '@hono/zod-openapi';

export const setup2faResponseDto = z.object({
  secret: z.string(),
  otpauthUrl: z.string(),
});

export type Setup2faResponseDto = z.infer<typeof setup2faResponseDto>;

