import { bodyLimit } from 'hono/body-limit';
import { fail } from '@/lib/response';

export const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

export const bodyLimitMiddleware = bodyLimit({
  maxSize: MAX_BODY_BYTES,
  onError: (c) => {
    return fail(c, 413, 'PAYLOAD_TOO_LARGE', 'Request payload exceeds 1 MB limit');
  },
});

