import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  DailyConfigResponse,
  MoodSubmitRequest,
  MoodSubmitResponse,
  ChoiceSubmitRequest,
  ChoiceSubmitResponse,
  TemplateCell,
  TemplateSubmitRequest,
  TemplateSubmitResponse,
  ConfessionVoteRequest,
  ConfessionVoteResponse,
  PromptSubmitRequest,
  PromptSubmitResponse,
  ErrorResponse,
  UserStats,
  DailyConfig,
  ShareCommentRequest,
  ShareCommentResponse,
  WeeklyRecapResponse,
  CanvasStateResponse,
  CanvasPlaceRequest,
  CanvasPlaceResponse,
  CanvasPixel,
  HotTakeStateResponse,
  HotTakeVoteRequest,
  HotTakeVoteResponse,
  HotTakeVoteCounts,
  HallOfFameResponse,
  HallOfFameEntry,
  CommunityConfessionsResponse,
  CommunityConfession,
  MySubmission,
  MySubmissionsResponse,
  PromptModerateRequest,
} from '../../shared/api';
import { formatReceipt, formatWeeklyRecap } from '../../shared/commentFormat';
import { CANVAS_PALETTE } from '../../shared/constants';
import { assignArchetype } from '../../shared/archetypes';
import { computeStreak, computeBadges } from '../../shared/streak';
import { generateDailyContent } from '../core/content';
import { buildContentBank } from '../core/content';
import { seedDemoData } from '../core/seed';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getUserStats(userId: string): Promise<UserStats> {
  const raw = await redis.get(`UserStats:${userId}`);
  if (raw) return JSON.parse(raw) as UserStats;
  return { streakDays: 0, lastPlayedDate: null, badges: [], roleTier: 'user', archetypeId: 'newcomer' };
}

async function updateStreak(userId: string): Promise<void> {
  const date = today();
  // Atomic lock via SET NX EX prevents double-increment when multiple sections submit in parallel
  // Pro Brain [C2]: old pattern used check-then-act (redis.get → redis.set) — two concurrent
  // requests could both pass the check. Now uses atomic SET with NX option.
  const lockKey = `StreakLock:${date}:${userId}`;
  const acquired = await redis.set(lockKey, '1', {
    nx: true,
    expiration: new Date(Date.now() + 60000),
  });
  if (!acquired) return; // another request already holds the lock

  const stats = await getUserStats(userId);
  stats.streakDays = computeStreak(stats.streakDays, stats.lastPlayedDate, date);
  stats.lastPlayedDate = date;
  stats.badges = computeBadges(stats.streakDays);
  await redis.set(`UserStats:${userId}`, JSON.stringify(stats));
}

/**
 * Fetch a user's mood history for the past N days from Redis.
 * Returns an array of mood keys in chronological order (oldest first).
 * Used by the archetype assignment system.
 */
async function getMoodHistory(userId: string, lookbackDays: number = 14): Promise<{ history: string[]; daysPlayed: number }> {
  const date = today();
  const history: string[] = [];
  let daysPlayed = 0;

  for (let i = lookbackDays - 1; i >= 0; i--) {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const mood = await redis.hGet(`MoodSubmitted:${dayStr}`, userId);
    if (mood) {
      history.push(mood);
      daysPlayed++;
    }
  }

  return { history, daysPlayed };
}


export const routes = new Hono();

routes.get('/daily-config', async (c) => {
  const { postId, userId } = context;
  if (!postId || !userId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Missing context' }, 400);
  }

  const date = today();
  const freshParam = c.req.query('fresh');

  // ── Try cached config first (built at midnight by rotation job, zero API calls) ──
  if (freshParam !== '1') {
    const rawConfig = await redis.get(`DailyConfig:${date}`);
    if (rawConfig) {
      let config: DailyConfig | null = null;
      try { config = JSON.parse(rawConfig) as DailyConfig; } catch { /* corrupt, fall through */ }
      if (config) {
        // Version check: invalidate stale configs from before Showerthoughts integration
        const configVersion = (config as Record<string, unknown>).configVersion as number ?? 0;
        if (configVersion >= 2) {
          if (!('hotTake' in config)) {
            (config as Record<string, unknown>).hotTake = { id: `hottake_${date}`, statement: 'Pineapple belongs on pizza and I will die on this hill.' };
          }
          config.userStats = await getUserStats(userId);
          // Archetype: compute from recent mood history (pure computation, no external APIs)
          const { history: moodHistory, daysPlayed: daysPlayedCount } = await getMoodHistory(userId);
          const userArchetype = assignArchetype(moodHistory, config.userStats.streakDays, daysPlayedCount);
          config.archetype = userArchetype;
          // Persist computed archetype to user stats
          config.userStats.archetypeId = userArchetype.id;
          await redis.set(`UserStats:${userId}`, JSON.stringify(config.userStats));
          // FOMO: show how many people played today
          config.playerCount = await redis.hLen(`MoodAggregate:${date}`);
          console.log(`[daily-config] Serving cached config for ${date} (v${configVersion})`);
          return c.json<DailyConfigResponse>(config);
        }
        console.log(`[daily-config] Stale config v${configVersion} — regenerating`);
      }
    }
  }

  // ── Fresh generation (from bank, or direct fetch as last resort) ──
  console.log(`[daily-config] Generating fresh config for ${date}${freshParam === '1' ? ' (fresh=1)' : ' (no cache)'}`);

  // Force-rebuild: delete all content bank keys to trigger fresh Reddit API fetch
  const rebuildParam = c.req.query('rebuild');
  if (rebuildParam === '1') {
    console.log('[daily-config] Force-rebuilding content bank');
    await Promise.all([
      redis.del('ContentBank:AskReddit'),
      redis.del('ContentBank:confession'),
      redis.del('ContentBank:unpopularopinion'),
      redis.del('ContentBank:Showerthoughts'),
      redis.del('ContentBank:meta'),
      redis.del('ContentBank:used'),
    ]);
  }

  // Build content bank if missing (check ALL bank keys, not just any — AND condition)
  // Pro Brain [Issue 4]: was OR condition, now AND to match loadContentBank() requirement
  const [askExists, confExists, opinExists, showerExists] = await Promise.all([
    redis.get('ContentBank:AskReddit'),
    redis.get('ContentBank:confession'),
    redis.get('ContentBank:unpopularopinion'),
    redis.get('ContentBank:Showerthoughts'),
  ]);
  const bankExists = askExists && confExists && opinExists && showerExists;
  if (!bankExists) {
    console.log('[daily-config] Content bank missing — building from Reddit API');
    await buildContentBank(30);
  }

  const fresh = await generateDailyContent();
  if (fresh) {
    const config: DailyConfig = {
      date,
      mood: fresh.mood,
      questions: fresh.questions,
      template: fresh.template as DailyConfig['template'],
      confession: fresh.confession,
      hotTake: fresh.hotTake,
      userStats: await (async () => {
        const stats = await getUserStats(userId);
        const { history: mh, daysPlayed: dp } = await getMoodHistory(userId);
        const arch = assignArchetype(mh, stats.streakDays, dp);
        stats.archetypeId = arch.id;
        await redis.set(`UserStats:${userId}`, JSON.stringify(stats));
        return stats;
      })(),
      archetype: await (async () => {
        const { history: mh, daysPlayed: dp } = await getMoodHistory(userId);
        const stats = await getUserStats(userId);
        return assignArchetype(mh, stats.streakDays, dp);
      })(),
      playerCount: await redis.hLen(`MoodAggregate:${date}`),
    };
    await redis.set(`DailyConfig:${date}`, JSON.stringify({ ...config, configVersion: 2 }));
    await redis.expire(`DailyConfig:${date}`, 2592000); // 30d TTL
    return c.json<DailyConfigResponse>(config);
  }

  // ── Hard fallback — should never happen in production ──
  const config: DailyConfig = {
    date,
    mood: { options: [
      { key: 'happy', emoji: '😊', label: "I'm on top of the world" },
      { key: 'sad', emoji: '😔', label: "I'm a hot mess" },
      { key: 'angry', emoji: '😡', label: "I'm low-key furious" },
      { key: 'excited', emoji: '🤩', label: "I'm hella hyped" },
      { key: 'tired', emoji: '😴', label: "I'm running on fumes" },
    ]},
    questions: [
      { id: `q_${date}_1`, question: 'Do you prioritize your mental health or your social media presence?', options: [{ id: `q_${date}_1a`, text: 'Mental health all the way' }, { id: `q_${date}_1b`, text: 'My followers need me' }] },
      { id: `q_${date}_2`, question: 'Would you rather talk to your future self or your past self for 10 minutes?', options: [{ id: `q_${date}_2a`, text: 'Future self, I need advice' }, { id: `q_${date}_2b`, text: 'Past self, I need to apologize' }] },
    ],
    template: { id: `bingo_${date}`, type: 'bingo', title: "Today's Life Bingo", cells: [[{ id: `${date}_b1`, text: 'Cat videos' }, { id: `${date}_b2`, text: 'Existential dread' }, { id: `${date}_b3`, text: 'Unexpected phone call' }], [{ id: `${date}_b4`, text: 'Coffee stain' }, { id: `${date}_b5`, text: '🆓 Free space' }, { id: `${date}_b6`, text: 'Forgotten password' }], [{ id: `${date}_b7`, text: 'Sudden rainstorm' }, { id: `${date}_b8`, text: 'Burnt toast' }, { id: `${date}_b9`, text: 'Unsolicited advice' }]] },
    confession: { id: `conf_${date}`, text: "I've been pretending to be a functional adult for years.", tags: ['Relatable', 'WTF', 'Wholesome', 'Needs Therapy'] },
    hotTake: { id: `hottake_${date}`, statement: 'Pineapple belongs on pizza and I will die on this hill.' },
    userStats: await (async () => {
      const stats = await getUserStats(userId);
      const { history: mh, daysPlayed: dp } = await getMoodHistory(userId);
      const arch = assignArchetype(mh, stats.streakDays, dp);
      stats.archetypeId = arch.id;
      await redis.set(`UserStats:${userId}`, JSON.stringify(stats));
      return stats;
    })(),
    archetype: await (async () => {
      const { history: mh, daysPlayed: dp } = await getMoodHistory(userId);
      const stats = await getUserStats(userId);
      return assignArchetype(mh, stats.streakDays, dp);
    })(),
    playerCount: await redis.hLen(`MoodAggregate:${date}`),
  };
  console.log(`[daily-config] Hardcoded fallback for ${date}`);
  return c.json<DailyConfigResponse>(config);
});

routes.post('/mood/submit', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const body = await c.req.json<MoodSubmitRequest>();
  const date = today();

  if (!body.moodKey || typeof body.moodKey !== 'string' || body.moodKey.length > 30) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid mood key' }, 400);
  }

  // 1-hour test bypass (set by seed-demo) — skips dedup for testing
  const testBypass = await redis.get(`TestBypass:${userId}`);

  const submitted = testBypass ? null : await redis.hGet(`MoodSubmitted:${date}`, userId);
  if (submitted) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Already submitted mood today' }, 409);
  }

  await redis.hSet(`MoodSubmitted:${date}`, { [userId]: body.moodKey });
  await redis.expire(`MoodSubmitted:${date}`, 2592000); // 30d TTL
  await redis.hIncrBy(`MoodAggregate:${date}`, body.moodKey, 1);
  await redis.expire(`MoodAggregate:${date}`, 2592000); // 30d TTL
  await updateStreak(userId);

  const aggregate = await redis.hGetAll(`MoodAggregate:${date}`);
  const numAgg: Record<string, number> = {};
  for (const [k, v] of Object.entries(aggregate)) numAgg[k] = parseInt(v ?? '0');

  return c.json<MoodSubmitResponse>({ status: 'ok', aggregate: numAgg });
});

routes.post('/choice/submit', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const body = await c.req.json<ChoiceSubmitRequest>();
  const date = today();

  if (!body.questionId || typeof body.questionId !== 'string' || body.questionId.length > 40) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid question id' }, 400);
  }
  if (!body.optionId || typeof body.optionId !== 'string' || body.optionId.length > 40) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid option id' }, 400);
  }

  const testBypass = await redis.get(`TestBypass:${userId}`);

  const submitted = testBypass ? null : await redis.hGet(`ChoiceSubmitted:${date}:${body.questionId}`, userId);
  if (submitted) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Already voted on this question today' }, 409);
  }

  await redis.hSet(`ChoiceSubmitted:${date}:${body.questionId}`, { [userId]: body.optionId });
  await redis.expire(`ChoiceSubmitted:${date}:${body.questionId}`, 2592000); // 30d TTL
  await redis.hIncrBy(`ChoiceAggregate:${date}:${body.questionId}`, body.optionId, 1);
  await redis.expire(`ChoiceAggregate:${date}:${body.questionId}`, 2592000); // 30d TTL

  // If custom text, store it separately
  if (body.customText) {
    const sanitized = body.customText.trim().slice(0, 200);
    if (sanitized) {
      await redis.hSet(`ChoiceCustomText:${date}:${body.questionId}`, { [userId]: sanitized });
      await redis.expire(`ChoiceCustomText:${date}:${body.questionId}`, 2592000); // 30d TTL
    }
  }

  await updateStreak(userId);

  const aggregate = await redis.hGetAll(`ChoiceAggregate:${date}:${body.questionId}`);
  const numAgg: Record<string, number> = {};
  for (const [k, v] of Object.entries(aggregate)) numAgg[k] = parseInt(v ?? '0');

  return c.json<ChoiceSubmitResponse>({ status: 'ok', aggregate: numAgg });
});

routes.post('/template/submit', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const body = await c.req.json<TemplateSubmitRequest>();
  const date = today();

  if (!body.templateId || typeof body.templateId !== 'string' || body.templateId.length > 40) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid template id' }, 400);
  }
  if (!Array.isArray(body.cellIds) || body.cellIds.length === 0 || body.cellIds.length > 9) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid cell ids' }, 400);
  }
  for (const cellId of body.cellIds) {
    if (typeof cellId !== 'string' || cellId.length > 40) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Invalid cell id' }, 400);
    }
  }

  const testBypass = await redis.get(`TestBypass:${userId}`);

  const submitted = testBypass ? null : await redis.hGet(`TemplateSubmitted:${date}:${body.templateId}`, userId);
  if (submitted) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Already submitted template today' }, 409);
  }

  await redis.hSet(`TemplateSubmitted:${date}:${body.templateId}`, { [userId]: '1' });
  await redis.expire(`TemplateSubmitted:${date}:${body.templateId}`, 2592000); // 30d TTL
  for (const cellId of body.cellIds) {
    await redis.hIncrBy(`TemplateAggregate:${date}:${body.templateId}`, cellId, 1);
  }
  await redis.expire(`TemplateAggregate:${date}:${body.templateId}`, 2592000); // 30d TTL
  await updateStreak(userId);

  const aggregate = await redis.hGetAll(`TemplateAggregate:${date}:${body.templateId}`);
  const numAgg: Record<string, number> = {};
  for (const [k, v] of Object.entries(aggregate)) numAgg[k] = parseInt(v ?? '0');

  const score = body.cellIds.length;
  return c.json<TemplateSubmitResponse>({ status: 'ok', score, aggregate: numAgg });
});

routes.post('/confession/vote', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const body = await c.req.json<ConfessionVoteRequest>();
  const date = today();

  if (!body.confessionId || typeof body.confessionId !== 'string' || body.confessionId.length > 30) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid confession id' }, 400);
  }
  if (!body.tag || typeof body.tag !== 'string' || body.tag.length > 30) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid tag' }, 400);
  }

  const testBypass = await redis.get(`TestBypass:${userId}`);

  const submitted = testBypass ? null : await redis.hGet(`ConfessionSubmitted:${date}:${body.confessionId}`, userId);
  if (submitted) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Already voted on this confession today' }, 409);
  }

  await redis.hSet(`ConfessionSubmitted:${date}:${body.confessionId}`, { [userId]: body.tag });
  await redis.expire(`ConfessionSubmitted:${date}:${body.confessionId}`, 2592000); // 30d TTL
  await redis.hIncrBy(`ConfessionAggregate:${date}:${body.confessionId}`, body.tag, 1);
  await redis.expire(`ConfessionAggregate:${date}:${body.confessionId}`, 2592000); // 30d TTL
  await updateStreak(userId);

  const aggregate = await redis.hGetAll(`ConfessionAggregate:${date}:${body.confessionId}`);
  const numAgg: Record<string, number> = {};
  let maxCount = 0;
  let majorityTag: string | null = null;
  let totalVotes = 0;

  for (const [k, v] of Object.entries(aggregate)) {
    const count = parseInt(v ?? '0');
    numAgg[k] = count;
    totalVotes += count;
    if (count > maxCount) {
      maxCount = count;
      majorityTag = k;
    }
  }

  return c.json<ConfessionVoteResponse>({ status: 'ok', majorityTag, totalVotes });
});

routes.post('/confessions/submit', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const body = await c.req.json<{ text: string }>();
  const date = today();

  if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0 || body.text.length > 500) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Confession must be 1-500 characters' }, 400);
  }

  // Rate limit: max 5 confessions per user per day (atomic)
  // Pro Brain [H4]: old pattern used check-then-act (get → check → set), allowing
  // concurrent requests to both pass and both write, resulting in 6+ submissions.
  // Now uses atomic incrBy with expire-on-first-access.
  const rateKey = `ConfessionRate:${date}:${userId}`;
  const newCount = await redis.incrBy(rateKey, 1);
  if (newCount === 1) {
    await redis.expire(rateKey, 86400); // set TTL on first access
  }
  if (newCount > 5) {
    return c.json<ErrorResponse>({ status: 'error', message: 'You\'ve submitted 5 confessions today. Come back tomorrow!' }, 429);
  }

  const sanitized = body.text.trim().slice(0, 500);
  const key = `ConfessionFeed:${date}`;
  const ts = Date.now();
  const entry: CommunityConfession = { userId, text: sanitized, timestamp: ts };
  await redis.hSet(key, { [`conf_${ts}_${userId}`]: JSON.stringify(entry) });
  await redis.expire(key, 2592000); // 30d TTL

  const count = await redis.hLen(key);
  if (count > 100) {
    const allFields = await redis.hGetAll(key);
    const sorted = Object.entries(allFields).sort(([a], [b]) => a.localeCompare(b));
    const toRemove = sorted.slice(0, sorted.length - 100).map(([k]) => k);
    if (toRemove.length > 0) await redis.hDel(key, toRemove);
  }

  return c.json<{ status: 'ok' }>({ status: 'ok' });
});

routes.get('/confessions/feed', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const date = today();
  const raw = await redis.hGetAll(`ConfessionFeed:${date}`);
  const confessions: CommunityConfession[] = Object.entries(raw)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => JSON.parse(v) as CommunityConfession);

  return c.json<CommunityConfessionsResponse>({
    confessions,
    total: confessions.length,
  });
});

routes.post('/prompts/submit', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const body = await c.req.json<PromptSubmitRequest>();
  const id = `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();
  const submission = { id, userId, type: body.type, payload: body.payload, status: 'pending', submittedAt: now };
  await redis.set(`PromptSubmission:${id}`, JSON.stringify(submission));
  await redis.zAdd('PromptSubmissionIds', { member: id, score: now });
  await redis.hIncrBy('PromptCounts:all', userId, 1);

  // Track submission IDs per-user so "My Submissions" can query without a full scan
  const userListKey = `UserSubmissions:${userId}`;
  const raw = await redis.get(userListKey);
  const userSubIds: string[] = raw ? JSON.parse(raw) as string[] : [];
  userSubIds.push(id);
  if (userSubIds.length > 200) userSubIds.shift(); // cap at most recent 200
  await redis.set(userListKey, JSON.stringify(userSubIds));
  await redis.expire(userListKey, 7776000); // 90d TTL

  return c.json<PromptSubmitResponse>({ status: 'ok', id });
});


routes.get('/prompts/my-submissions', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const userListKey = `UserSubmissions:${userId}`;
  const raw = await redis.get(userListKey);
  const userSubIds: string[] = raw ? JSON.parse(raw) as string[] : [];

  if (userSubIds.length === 0) {
    return c.json<MySubmissionsResponse>({ submissions: [], total: 0 });
  }

  // Fetch all submissions in parallel (most recent first)
  const reversed = [...userSubIds].reverse();
  const results = await Promise.all(
    reversed.map(async (id) => {
      const data = await redis.get(`PromptSubmission:${id}`);
      if (!data) return null;
      try { return JSON.parse(data) as MySubmission; } catch { return null; }
    })
  );

  const submissions = results.filter((s): s is MySubmission => s !== null);
  return c.json<MySubmissionsResponse>({ submissions, total: submissions.length });
});
routes.post('/prompts/moderate', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const stats = await getUserStats(userId);
  if (stats.roleTier !== 'moderator' && stats.roleTier !== 'admin') {
    return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 403);
  }

  const body = await c.req.json<PromptModerateRequest>();
  const raw = await redis.get(`PromptSubmission:${body.submissionId}`);
  if (!raw) return c.json<ErrorResponse>({ status: 'error', message: 'Submission not found' }, 404);

  const submission = JSON.parse(raw);
  submission.status = body.action === 'approve' ? 'approved' : 'rejected';
  if (body.action === 'reject' && body.reason) {
    submission.rejectionReason = body.reason;
  }
  await redis.set(`PromptSubmission:${body.submissionId}`, JSON.stringify(submission));

  if (body.action === 'approve') {
    await redis.zAdd('PromptQueue', { member: body.submissionId, score: Date.now() });
  }

  return c.json<{ status: 'ok' }>({ status: 'ok' });
});

routes.post('/results/comment', async (c) => {
  const { userId, postId, subredditName } = context;
  if (!userId || !postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Missing context' }, 400);
  }

  const body = await c.req.json<ShareCommentRequest>();
  const r = body.results;
  if (!r) return c.json<ErrorResponse>({ status: 'error', message: 'Missing results' }, 400);

  // Cadence guard — one comment per user per prompt cycle
  const date = today();
  const lockKey = `CommentLock:${date}:${userId}`;
  const msUntilMidnight = new Date(date + 'T00:00:00Z').getTime() + 86400000 - Date.now();
  const lockTtl = Math.max(60, Math.ceil(msUntilMidnight / 1000));

  const acquired = await redis.set(lockKey, '1', {
    nx: true,
    expiration: new Date(Date.now() + lockTtl * 1000),
  });
  if (!acquired) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Already shared this session' }, 429);
  }

  // ── Enrich with live community data ──
  let templateGrid: TemplateCell[][] | undefined;
  let confessionAgreementPct: number | undefined;
  let confessionTotalVotes: number | undefined;
  let confessionText: string | undefined;
  let moodCommunityPct: number | undefined;

  const dailyConfigRaw = await redis.get(`DailyConfig:${date}`);
  if (dailyConfigRaw) {
    const dailyConfig = JSON.parse(dailyConfigRaw) as DailyConfig;

    if (dailyConfig.template?.cells) {
      templateGrid = dailyConfig.template.cells;
    }

    if (r.confession?.tag && dailyConfig.confession?.id) {
      const confAgg = await redis.hGetAll(
        `ConfessionAggregate:${date}:${dailyConfig.confession.id}`,
      );
      let totalVotes = 0;
      let userTagVotes = 0;
      for (const [k, v] of Object.entries(confAgg)) {
        const count = parseInt(v ?? '0');
        totalVotes += count;
        if (k === r.confession.tag) userTagVotes = count;
      }
      if (totalVotes > 0) {
        confessionAgreementPct = Math.round((userTagVotes / totalVotes) * 100);
        confessionTotalVotes = totalVotes;
      }
      confessionText = dailyConfig.confession.text;
    }

    if (r.mood) {
      const moodAgg = await redis.hGetAll(`MoodAggregate:${date}`);
      let totalMoodVotes = 0;
      let userMoodVotes = 0;
      for (const [k, v] of Object.entries(moodAgg)) {
        const count = parseInt(v ?? '0');
        totalMoodVotes += count;
        if (k === r.mood.key) userMoodVotes = count;
      }
      if (totalMoodVotes > 0) {
        moodCommunityPct = Math.round((userMoodVotes / totalMoodVotes) * 100);
      }
    }
  }

  const userStats = await getUserStats(userId);
  const commentText = formatReceipt(r, subredditName ?? 'StoryArcade', {
    templateGrid,
    confessionAgreementPct,
    confessionTotalVotes,
    confessionText: r.confession?.text ?? confessionText,
    moodCommunityPct,
    archetypeId: userStats.archetypeId,
  });

  try {
    // Use submitComment directly (works in both dev and prod, no getPostById needed)
    const comment = await reddit.submitComment({ id: postId, text: commentText });
    return c.json<ShareCommentResponse>({ status: 'ok', commentId: comment.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to submit comment:', msg, 'postId:', postId);
    // Release lock on failure so user can retry
    await redis.del(lockKey);
    // One more try with getPostById approach
    try {
      const post = await reddit.getPostById(postId as unknown as `t3_${string}`);
      const comment = await post.addComment({ text: commentText });
      // Re-acquire lock after successful fallback
      await redis.set(lockKey, '1', {
        nx: true,
        expiration: new Date(Date.now() + lockTtl * 1000),
      });
      return c.json<ShareCommentResponse>({ status: 'ok', commentId: comment.id });
    } catch (err2: unknown) {
      const msg2 = err2 instanceof Error ? err2.message : String(err2);
      return c.json<ErrorResponse>({ status: 'error', message: `Failed: ${msg2.slice(0, 100)}` }, 500);
    }
  }
});

routes.post('/weekly/recap/share', async (c) => {
  const { userId, postId, subredditName } = context;
  if (!userId || !postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Missing context' }, 400);
  }

  const body = await c.req.json<{ recap: WeeklyRecapResponse }>();
  const r = body.recap;
  if (!r) return c.json<ErrorResponse>({ status: 'error', message: 'Missing recap data' }, 400);

  const date = today();
  const lockKey = `CommentLock:${date}:${userId}:weekly`;
  const msUntilMidnight = new Date(date + 'T00:00:00Z').getTime() + 86400000 - Date.now();
  const lockTtl = Math.max(60, Math.ceil(msUntilMidnight / 1000));

  const acquired = await redis.set(lockKey, '1', {
    nx: true,
    expiration: new Date(Date.now() + lockTtl * 1000),
  });
  if (!acquired) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Already shared your weekly recap today' }, 429);
  }

  const commentText = formatWeeklyRecap(r, subredditName ?? 'StoryArcade', postId as unknown as string);

  try {
    const comment = await reddit.submitComment({ id: postId, text: commentText });
    return c.json<ShareCommentResponse>({ status: 'ok', commentId: comment.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to submit weekly recap comment:', msg, 'postId:', postId);
    // Release lock so user can retry
    await redis.del(lockKey);
    // Fallback: try getPostById approach
    try {
      const post = await reddit.getPostById(postId as unknown as `t3_${string}`);
      const comment = await post.addComment({ text: commentText });
      // Re-acquire lock after successful fallback
      await redis.set(lockKey, '1', {
        nx: true,
        expiration: new Date(Date.now() + lockTtl * 1000),
      });
      return c.json<ShareCommentResponse>({ status: 'ok', commentId: comment.id });
    } catch (err2: unknown) {
      const msg2 = err2 instanceof Error ? err2.message : String(err2);
      return c.json<ErrorResponse>({ status: 'error', message: `Failed to post: ${msg2.slice(0, 100)}` }, 500);
    }
  }
});

routes.get('/canvas', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const date = today();
  const canvasRaw = await redis.hGetAll(`Canvas:${date}`);
  const pixels: CanvasPixel[] = [];
  let userPixel: CanvasPixel | null = null;

  for (const [uid, val] of Object.entries(canvasRaw)) {
    if (val) {
      const p = JSON.parse(val) as CanvasPixel;
      pixels.push(p);
      if (uid === userId) userPixel = p;
    }
  }

  return c.json<CanvasStateResponse>({
    pixels,
    userPixel,
    totalPlaced: pixels.length,
    date,
  });
});

routes.post('/canvas/place', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const body = await c.req.json<CanvasPlaceRequest>();
  const date = today();

  if (body.x < 0 || body.x > 15 || body.y < 0 || body.y > 15) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Coordinates out of bounds' }, 400);
  }

  const palette = CANVAS_PALETTE as readonly string[];
  if (!palette.includes(body.color)) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid color' }, 400);
  }

  const existing = await redis.hGet(`Canvas:${date}`, userId);
  if (existing) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Already placed a pixel today' }, 409);
  }

  const pixel: CanvasPixel = { x: body.x, y: body.y, color: body.color };
  await redis.hSet(`Canvas:${date}`, { [userId]: JSON.stringify(pixel) });
  await redis.expire(`Canvas:${date}`, 2592000); // 30d TTL

  const pixelCount = await redis.hLen(`Canvas:${date}`);
  return c.json<CanvasPlaceResponse>({ status: 'ok', pixelCount });
});

routes.get('/hot-take', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const date = today();
  const configRaw = await redis.get(`DailyConfig:${date}`);
  if (!configRaw) {
    return c.json<ErrorResponse>({ status: 'error', message: 'No config for today' }, 404);
  }

  const config = JSON.parse(configRaw) as DailyConfig;
  const rawCounts = await redis.hGetAll(`HotTakeCounts:${date}`);
  const voteCounts: HotTakeVoteCounts = {
    agree: parseInt(rawCounts['agree'] ?? '0'),
    disagree: parseInt(rawCounts['disagree'] ?? '0'),
    unsure: parseInt(rawCounts['unsure'] ?? '0'),
  };
  const totalVotes = voteCounts.agree + voteCounts.disagree + voteCounts.unsure;

  const userVoteRaw = await redis.hGet(`HotTakeVotes:${date}`, userId);
  const userVote = (userVoteRaw === 'agree' || userVoteRaw === 'disagree' || userVoteRaw === 'unsure')
    ? userVoteRaw as 'agree' | 'disagree' | 'unsure'
    : null;

  return c.json<HotTakeStateResponse>({
    hotTake: config.hotTake ?? { id: `hottake_${date}`, statement: 'Placeholder hot take' },
    voteCounts,
    userVote,
    totalVotes,
    date,
  });
});

routes.post('/hot-take/vote', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const body = await c.req.json<HotTakeVoteRequest>();
  const date = today();

  if (!['agree', 'disagree', 'unsure'].includes(body.vote)) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Invalid vote' }, 400);
  }

  const existing = await redis.hGet(`HotTakeVotes:${date}`, userId);
  if (existing) {
    return c.json<ErrorResponse>({ status: 'error', message: 'Already voted today' }, 409);
  }

  await redis.hSet(`HotTakeVotes:${date}`, { [userId]: body.vote });
  await redis.expire(`HotTakeVotes:${date}`, 2592000); // 30d TTL
  await redis.hIncrBy(`HotTakeCounts:${date}`, body.vote, 1);
  await redis.expire(`HotTakeCounts:${date}`, 2592000); // 30d TTL

  const rawCounts = await redis.hGetAll(`HotTakeCounts:${date}`);
  const voteCounts: HotTakeVoteCounts = {
    agree: parseInt(rawCounts['agree'] ?? '0'),
    disagree: parseInt(rawCounts['disagree'] ?? '0'),
    unsure: parseInt(rawCounts['unsure'] ?? '0'),
  };
  const totalVotes = voteCounts.agree + voteCounts.disagree + voteCounts.unsure;

  return c.json<HotTakeVoteResponse>({ status: 'ok', voteCounts, totalVotes });
});

routes.get('/community/hall-of-fame', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const raw = await redis.hGetAll('PromptCounts:all');
  const entries: { userId: string; count: number }[] = Object.entries(raw)
    .map(([uid, cnt]) => ({ userId: uid, count: parseInt(cnt ?? '0') }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (entries.length === 0) {
    return c.json<HallOfFameResponse>({ entries: [], totalContributors: 0 });
  }

  // Fetch usernames for display (best-effort, may fail silently)
  const enriched: HallOfFameEntry[] = [];
  for (const entry of entries) {
    let username = 'anonymous';
    try {
      const user = await reddit.getUserById(`t2_${entry.userId}` as `t2_${string}`);
      if (user?.username) username = user.username;
    } catch { /* fall back to truncated userId */ }
    enriched.push({ displayName: username, submissionCount: entry.count });
  }

  return c.json<HallOfFameResponse>({
    entries: enriched,
    totalContributors: entries.length,
  });
});

routes.get('/weekly/recap', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  const date = today();

  const cacheKey = `WeeklyRecap:${userId}:${date}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    try {
      return c.json<WeeklyRecapResponse>(JSON.parse(cached));
    } catch { /* corrupt, fall through to recompute */ }
  }

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const weekEnding = dates[0] ?? '';

  let totalDaysPlayed = 0;
  const moodCounts: Record<string, number> = {};
  const moodOptions: Record<string, { key: string; emoji: string; label: string }> = {};
  const choiceStats: Record<string, { count: number; question: string; chosenSide: string }> = {};
  let totalBingoCells = 0;
  let bingoDayCount = 0;
  let totalConfessionVotes = 0;

  // Phase 1: Fetch all 7 daily configs in parallel
  const configResults = await Promise.all(
    dates.map(async (d) => {
      const raw = await redis.get(`DailyConfig:${d}`);
      return { date: d, config: raw ? (JSON.parse(raw) as DailyConfig) : null };
    })
  );

  // Phase 2: For each day with a config, fetch aggregates in parallel
  for (const { date: d, config: dailyConfig } of configResults) {
    if (!dailyConfig) continue;

    for (const opt of dailyConfig.mood?.options ?? []) {
      moodOptions[opt.key] = opt;
    }

    // Fetch mood + template + confession in parallel, then choices
    const [moodAgg, templateAgg, confAgg] = await Promise.all([
      redis.hGetAll(`MoodAggregate:${d}`),
      redis.hGetAll(`TemplateAggregate:${d}:${dailyConfig.template?.id ?? ''}`),
      redis.hGetAll(`ConfessionAggregate:${d}:${dailyConfig.confession?.id ?? ''}`),
    ]);

    if (Object.keys(moodAgg).length > 0) {
      totalDaysPlayed++;
      for (const [k, v] of Object.entries(moodAgg)) {
        moodCounts[k] = (moodCounts[k] ?? 0) + parseInt(v ?? '0');
      }
    }

    // Choice aggregates — fetch in parallel per question
    if (dailyConfig.questions && dailyConfig.questions.length > 0) {
      const choiceResults = await Promise.all(
        dailyConfig.questions.map(async (q) => {
          const agg = await redis.hGetAll(`ChoiceAggregate:${d}:${q.id}`);
          return { question: q, aggregate: agg };
        })
      );
      for (const { question: q, aggregate: choiceAgg } of choiceResults) {
        if (Object.keys(choiceAgg).length > 0) {
          let maxCount = 0;
          let topOptId = '';
          for (const [k, v] of Object.entries(choiceAgg)) {
            const count = parseInt(v ?? '0');
            if (count > maxCount) { maxCount = count; topOptId = k; }
          }
          const option = q.options.find((o: { id: string; text: string }) => o.id === topOptId);
          const existing = choiceStats[q.id];
          if (!existing || maxCount > existing.count) {
            choiceStats[q.id] = { count: maxCount, question: q.question ?? '', chosenSide: option?.text ?? topOptId };
          }
        }
      }
    }

    // Template — already fetched in parallel batch above
    if (Object.keys(templateAgg).length > 0) {
      const allCells = dailyConfig.template?.cells?.flat() ?? [];
      let checkedCount = 0;
      for (const cell of allCells) {
        const cellCount = parseInt(templateAgg[cell.id] ?? '0');
        if (cellCount > 0) checkedCount++;
      }
      totalBingoCells += checkedCount;
      bingoDayCount++;
    }

    // Confession — already fetched in parallel batch above
    if (Object.keys(confAgg).length > 0) {
      for (const v of Object.values(confAgg)) {
        totalConfessionVotes += parseInt(v ?? '0');
      }
    }
  }

  let dominantMoodKey = '';
  let maxMoodCount = 0;
  for (const [k, v] of Object.entries(moodCounts)) {
    if (v > maxMoodCount) {
      maxMoodCount = v;
      dominantMoodKey = k;
    }
  }

  const totalMoodVotes = Object.values(moodCounts).reduce((a, b) => a + b, 0);
  let dominantMood: { key: string; emoji: string; label: string; pct: number } | null = null;
  if (dominantMoodKey) {
    const m = moodOptions[dominantMoodKey];
    if (m) {
      dominantMood = {
        key: m.key,
        emoji: m.emoji,
        label: m.label,
        pct: totalMoodVotes > 0 ? Math.round((maxMoodCount / totalMoodVotes) * 100) : 0,
      };
    }
  }

  let topChoiceKey = '';
  let maxChoiceCount = 0;
  for (const [k, v] of Object.entries(choiceStats)) {
    if (v.count > maxChoiceCount) {
      maxChoiceCount = v.count;
      topChoiceKey = k;
    }
  }
  const totalChoiceVotes = Object.values(choiceStats).reduce((a, b) => a + b.count, 0);
  let topChoice: { question: string; chosenSide: string; pct: number } | null = null;
  if (topChoiceKey) {
    const tc = choiceStats[topChoiceKey];
    if (tc) {
      topChoice = {
        question: tc.question,
        chosenSide: tc.chosenSide,
        pct: maxChoiceCount > 0 && totalChoiceVotes > 0 ? Math.round((maxChoiceCount / totalChoiceVotes) * 100) : 0,
      };
    }
  }

  const avgBingoScore = bingoDayCount > 0 ? Math.round(totalBingoCells / bingoDayCount) : 0;

  // ---- Dynamic personality profile ----
  // Combines dominant mood + engagement level + play style
  const personalityLabel: string = (() => {
    const isDedicated = totalDaysPlayed >= 5;
    const isStrategic = avgBingoScore >= 5;

    // Mood + engagement combinations
    switch (dominantMoodKey) {
      case 'happy':
        return isDedicated ? 'The Radiant Regular' : 'The Optimist';
      case 'sad':
        return isStrategic ? 'The Brooding Mastermind' : 'The Deep Thinker';
      case 'angry':
        return isDedicated ? 'The Fired Up' : 'The Firebrand';
      case 'excited':
        return isStrategic ? 'The Hype Architect' : 'The Enthusiast';
      case 'tired':
        return isDedicated ? 'The Committed Exhausted' : 'The Survivor';
      case 'anxious':
        return 'The Spiral Surfer';
      case 'chill':
        return 'The Zen Master';
      case 'chaotic':
        return 'The Gremlin';
      case 'hopeful':
        return isDedicated ? 'The Dreamer' : 'The Believer';
      case 'meh':
        return 'The Indifferent';
      case 'loved':
        return 'The Heartfelt';
      case 'cooked':
        return 'The Well-Done';
      case 'nostalgic':
        return 'The Time Traveler';
      case 'adventurous':
        return 'The Explorer';
      default:
        if (totalDaysPlayed === 7) return 'The Completionist';
        if (totalDaysPlayed >= 3) return 'The Story Arcadian';
        return 'The Newcomer';
    }
  })();

  const stats = await getUserStats(userId);

  const result: WeeklyRecapResponse = {
    weekEnding,
    totalDaysPlayed,
    dominantMood,
    topChoice,
    avgBingoScore,
    confessionMajorityCount: totalConfessionVotes,
    streakDays: stats.streakDays,
    badges: stats.badges,
    personalityLabel,
    archetypeId: (() => {
      // Compute archetype from mood patterns observed this week
      const moodHistory: string[] = [];
      if (dominantMoodKey) {
        for (let i = 0; i < totalDaysPlayed; i++) {
          moodHistory.push(dominantMoodKey);
        }
      }
      const arch = assignArchetype(moodHistory, stats.streakDays, totalDaysPlayed);
      return arch.id;
    })(),
  };

  await redis.set(cacheKey, JSON.stringify(result));
  await redis.expire(cacheKey, 3600); // 1-hour cache

  return c.json<WeeklyRecapResponse>(result);
});

routes.post('/internal/seed-demo', async (c) => {
  const { userId } = context;
  if (!userId) return c.json<ErrorResponse>({ status: 'error', message: 'Unauthorized' }, 401);

  // Always set test bypass FIRST — regardless of role or seed outcome
  await redis.set(`TestBypass:${userId}`, '1');
  await redis.expire(`TestBypass:${userId}`, 3600);

  // Also clear today's submission locks so user can immediately re-submit
  const date = today();
  await Promise.all([
    redis.del(`MoodSubmitted:${date}`),
    redis.del(`StreakLock:${date}:${userId}`),
    redis.del(`CommentLock:${date}:${userId}`),
    redis.del(`CommentLock:${date}:${userId}:weekly`),
  ]);
  // Choice/Template/Confession use per-question keys — clear those too
  const configRaw = await redis.get(`DailyConfig:${date}`);
  if (configRaw) {
    const config = JSON.parse(configRaw);
    const questions = Array.isArray((config as Record<string, unknown>).questions) ? (config as Record<string, unknown>).questions as Array<{ id: string }> : [];
    const template = (config as Record<string, unknown>).template as { id?: string } | undefined;
    const confession = (config as Record<string, unknown>).confession as { id?: string } | undefined;
    const keysToDel: string[] = [];
    for (const q of questions) {
      keysToDel.push(`ChoiceSubmitted:${date}:${q.id}`);
    }
    if (template?.id) keysToDel.push(`TemplateSubmitted:${date}:${template.id}`);
    if (confession?.id) keysToDel.push(`ConfessionSubmitted:${date}:${confession.id}`);
    if (keysToDel.length > 0) {
      await Promise.all(keysToDel.map(k => redis.del(k)));
    }
  }

  // Admin/mod guard only for the actual seed operation
  const stats = await getUserStats(userId);
  if (stats.roleTier !== 'admin' && stats.roleTier !== 'moderator') {
    return c.json({ status: 'ok', testBypass: '1 hour', note: 'Test bypass active but seed requires admin' });
  }

  try {
    const logs = await seedDemoData();
    return c.json({ status: 'ok', logs, testBypass: '1 hour' });
  } catch (err) {
    console.error('Seed failed:', err);
    // Bypass still active even if seed failed
    return c.json({ status: 'ok', testBypass: '1 hour', note: 'Seed failed but test bypass active' });
  }
});

// ── Debug endpoints for diagnosing content bank issues ──

routes.get('/debug/reddit-test', async (c) => {
  const subreddit = c.req.query('subreddit') || 'Showerthoughts';
  try {
    const listing = await reddit.getHotPosts({ subredditName: subreddit, limit: 5, pageSize: 5 });
    const posts = await listing.all();
    return c.json({ status: 'ok', subreddit, count: posts.length, posts: posts.map(p => ({ title: p.title, id: p.id })) });
  } catch (err) {
    return c.json({ status: 'error', subreddit, error: err instanceof Error ? err.message : String(err) });
  }
});

routes.get('/debug/bank-state', async (c) => {
  const keys = ['ContentBank:AskReddit', 'ContentBank:confession', 'ContentBank:unpopularopinion', 'ContentBank:Showerthoughts', 'ContentBank:meta'];
  const state: Record<string, unknown> = {};
  for (const key of keys) {
    const raw = await redis.get(key);
    state[key] = raw ? 'exists' : null;
  }
  state.dailyConfig = (await redis.get(`DailyConfig:${today()}`)) ? 'exists' : null;
  return c.json(state);
});
