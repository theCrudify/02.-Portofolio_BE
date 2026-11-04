import { z } from '@hono/zod-openapi';

export const deleteDocumentParamSchema = z.object({
  id: z.string().min(1),
});

export type DeleteDocumentParamDto = z.infer<typeof deleteDocumentParamSchema>;
