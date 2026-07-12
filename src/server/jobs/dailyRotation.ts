import { redis } from '@devvit/web/server';
import { reddit } from '@devvit/web/server';
import { generateDailyContent, generateMoodOptions, buildContentBank } from '../core/content';

type DailyConfig = {
  date: string;
  mood: { options: { key: string; emoji: string; label: string }[] };
  questions: { id: string; question: string; options: { id: string; text: string }[] }[];
  template: { id: string; type: string; title: string; cells: { id: string; text: string }[][] };
  confession: { id: string; text: string; tags: string[] };
  hotTake: { id: string; statement: string };
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultConfig(date: string): DailyConfig {
  return {
    date,
    mood: { options: generateMoodOptions(date) },
    questions: [
      {
        id: `q_${date}_1`,
        question: 'Do you prioritize your mental health or your social media presence?',
        options: [
          { id: `q_${date}_1a`, text: 'Mental health all the way' },
          { id: `q_${date}_1b`, text: 'My followers need me' },
        ],
      },
      {
        id: `q_${date}_2`,
        question: 'Would you rather talk to your future self or your past self for 10 minutes?',
        options: [
          { id: `q_${date}_2a`, text: 'Future self, I need advice' },
          { id: `q_${date}_2b`, text: 'Past self, I need to apologize' },
        ],
      },
    ],
    template: {
      id: `bingo_${date}`,
      type: 'bingo',
      title: 'Chaotic Life Bingo',
      cells: [
        [
          { id: `${date}_b1`, text: 'Cat videos' },
          { id: `${date}_b2`, text: 'Existential dread' },
          { id: `${date}_b3`, text: 'Unexpected phone call' },
        ],
        [
          { id: `${date}_b4`, text: 'Coffee stain on my shirt' },
          { id: `${date}_b5`, text: 'Free space' },
          { id: `${date}_b6`, text: 'Forgotten password' },
        ],
        [
          { id: `${date}_b7`, text: 'Sudden rainstorm' },
          { id: `${date}_b8`, text: 'Burnt toast' },
          { id: `${date}_b9`, text: 'Unsolicited advice' },
        ],
      ],
    },
    confession: {
      id: `conf_${date}`,
      text: "I've been pretending to be a functional adult for years, but honestly I have no idea what I'm doing and I'm just waiting for someone to notice that I'm winging it.",
      tags: ['Relatable', 'WTF', 'Wholesome', 'Needs Therapy'],
    },
    hotTake: {
      id: `hottake_${date}`,
      statement: 'Pineapple belongs on pizza and I will die on this hill.',
    },
  };
}

async function getNextQueuedConfig(): Promise<DailyConfig | null> {
  const queueKey = 'PromptQueue';
  const queueData = await redis.get(queueKey);
  const queue: string[] = queueData ? JSON.parse(queueData) : [];
  if (queue.length === 0) return null;

  const submissionId = queue.shift();
  await redis.set(queueKey, JSON.stringify(queue));
  if (!submissionId) return null;

  const raw = await redis.get(`PromptSubmission:${submissionId}`);
  if (!raw) return null;

  let submission;
  try { submission = JSON.parse(raw); } catch { return null; }
  const payload = submission.payload ?? {};
  const date = today();
  const base = defaultConfig(date);

  return {
    date,
    mood: payload.mood ?? base.mood,
    questions: payload.questions ?? base.questions,
    template: payload.template ?? base.template,
    confession: payload.confession ?? base.confession,
    hotTake: payload.hotTake ?? base.hotTake,
  };
}

async function generatePostTitle(): Promise<string> {
  const date = today();
  const yDate = (() => {
    const d = new Date(date);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const moodAgg = await redis.hGetAll(`MoodAggregate:${yDate}`);
  if (Object.keys(moodAgg).length > 0) {
    let topMood = '';
    let topCount = 0;
    let totalVotes = 0;
    for (const [k, v] of Object.entries(moodAgg)) {
      const count = parseInt(v ?? '0');
      totalVotes += count;
      if (count > topCount) { topCount = count; topMood = k; }
    }
    const pct = totalVotes > 0 ? Math.round((topCount / totalVotes) * 100) : 0;
    const labels: Record<string, string> = {
      happy: 'on top of the world', sad: 'in their feels', angry: 'fired up',
      excited: 'hyped', tired: 'running on fumes', anxious: 'spiraling',
      chill: 'unbothered', chaotic: 'pure chaos', hopeful: 'manifesting',
      meh: 'whelmed', loved: 'heartfelt', cooked: 'well-done',
      nostalgic: 'time traveling', adventurous: 'exploring',
    };
    const vibe = labels[topMood] ?? topMood;
    if (pct >= 60) return `Story Arcade: Yesterday was ${pct}% ${vibe} energy. How are you showing up today?`;
    if (totalVotes >= 3) return `Story Arcade — yesterday's top mood: ${vibe} at ${pct}%. Drop your story today!`;
  }

  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const hooks = [
    `${days[new Date(date).getUTCDay()]}'s Arcade — ready to make your story?`,
    `It's ${days[new Date(date).getUTCDay()]}. The Arcade is open.`,
    `${days[new Date(date).getUTCDay()]} mood check — thriving or surviving?`,
  ];
  return hooks[Math.floor(Math.random() * hooks.length)] ?? `Story Arcade — ${date}`;
}

export async function runDailyRotation(): Promise<void> {
  const date = today();
  const existing = await redis.get(`DailyConfig:${date}`);
  if (existing) {
    const parsed = JSON.parse(existing);
    if (parsed.generatedVia === 'reddit-api') {
      console.log(`[rotation] Fresh config already exists for ${date} — skipping`);
      return;
    }
    console.log(`[rotation] Stale config detected for ${date} — regenerating`);
  }

  // Build content bank FIRST (so generateDailyContent reads from it, not direct API)
  await buildContentBank(30);
  console.log('[rotation] Content bank built');

  console.log(`[rotation] Generating daily content for ${date}...`);
  const queued = await getNextQueuedConfig();
  if (queued) {
    console.log('[rotation] Using queued UGC prompt');
  }
  const aiContent = queued ? null : await generateDailyContent();

  const config: DailyConfig = queued ?? (aiContent ? { date, ...aiContent } : defaultConfig(date));

  if (aiContent) {
    console.log('[rotation] Using AI-generated content');
  } else if (!queued) {
    console.log('[rotation] Using hardcoded default content (AI unavailable, no UGC queued)');
  }

    await redis.set(`DailyConfig:${date}`, JSON.stringify({ ...config, generatedVia: 'reddit-api' }));

  try {
    const title = await generatePostTitle();
    await reddit.submitCustomPost({ title });
    console.log(`[rotation] Created new post: "${title}"`);
  } catch (err) {
    console.error('Failed to create daily post:', err);
  }
}

export const handler = {
  endpoint: '/internal/scheduler/daily-rotation',
  run: () => runDailyRotation(),
};

// Force-regenerate (menu-driven, for testing)
export async function forceDailyRotation(): Promise<void> {
  const date = today();
  const existed = await redis.get(`DailyConfig:${date}`);
  if (existed) {
    await redis.del(`DailyConfig:${date}`);
    console.log(`[rotation] Deleted existing config for ${date} — force regeneration`);
  }
  await runDailyRotation();
}
