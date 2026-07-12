import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { createPost } from '../core/post';
import { forceDailyRotation } from '../jobs/dailyRotation';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    await forceDailyRotation();
    const post = await createPost();
    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>({ showToast: 'Failed to create post' }, 400);
  }
});

menu.post('/moderate-prompts', async (c) => {
  try {
    const members = await redis.zRange('PromptSubmissionIds', 0, -1);
    const ids = members.map((m) => m.member);
    const rawList = await redis.mGet(ids);
    const pending: { id: string; userId: string; type: string; payload: Record<string, unknown>; status: string }[] = [];
    for (const raw of rawList) {
      if (!raw) continue;
      const submission = JSON.parse(raw);
      if (submission.status === 'pending') {
        pending.push(submission);
      }
    }
    return c.json({ status: 'ok', pending, count: pending.length });
  } catch (error) {
    console.error('Error listing prompts:', error);
    return c.json<UiResponse>({ showToast: 'Failed to load pending prompts' }, 500);
  }
});
