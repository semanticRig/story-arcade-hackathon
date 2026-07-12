import { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import type { UiResponse } from '@devvit/web/shared';

type ModerateFormValues = {
  submissionId?: string;
  action?: 'approve' | 'reject';
};

export const forms = new Hono();

forms.post('/moderate-prompt', async (c) => {
  const { submissionId, action } = await c.req.json<ModerateFormValues>();
  if (!submissionId || !action) {
    return c.json<UiResponse>({ showToast: 'Missing required fields' }, 400);
  }

  const raw = await redis.get(`PromptSubmission:${submissionId}`);
  if (!raw) return c.json<UiResponse>({ showToast: 'Submission not found' }, 404);

  const submission = JSON.parse(raw);
  submission.status = action === 'approve' ? 'approved' : 'rejected';
  await redis.set(`PromptSubmission:${submissionId}`, JSON.stringify(submission));

  if (action === 'approve') {
    const queueKey = 'PromptQueue';
    const queueData = await redis.get(queueKey);
    const queue: string[] = queueData ? JSON.parse(queueData) : [];
    queue.push(submissionId);
    await redis.set(queueKey, JSON.stringify(queue));
  }

  return c.json<UiResponse>({ showToast: `Submission ${submissionId} ${action}d` }, 200);
});
