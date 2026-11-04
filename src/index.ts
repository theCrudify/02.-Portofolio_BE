import { Hono } from 'hono';

export const app = new Hono();

app.get('/', (c) => {
  return c.json({ data: { name: 'portfolio-api', status: 'ok' } });
});

export default {
  fetch: app.fetch,
};

