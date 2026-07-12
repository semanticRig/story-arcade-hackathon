import { Hono } from 'hono';
import { getRequestListener } from '@hono/node-server';
import { createServer, getServerPort } from '@devvit/web/server';
import { routes } from './routes/api';
import { forms } from './routes/forms';
import { menu } from './routes/menu';
import { triggers } from './routes/triggers';
import { runDailyRotation } from './jobs/dailyRotation';

const app = new Hono();
const internal = new Hono();

internal.route('/menu', menu);
internal.route('/form', forms);
internal.route('/triggers', triggers);

internal.post('/scheduler/daily-rotation', async (c) => {
  try {
    await runDailyRotation();
    return c.json({ status: 'ok' }, 200);
  } catch (error) {
    console.error('Daily rotation failed:', error);
    return c.json({ status: 'error', message: 'Rotation failed' }, 500);
  }
});

app.route('/api', routes);
app.route('/internal', internal);

const requestListener = getRequestListener(app.fetch);
createServer(requestListener).listen(getServerPort());
