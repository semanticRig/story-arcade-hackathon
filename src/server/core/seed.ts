import { redis } from '@devvit/web/server';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Generate last N dates (YYYY-MM-DD) starting from yesterday going back */
function lastDays(count: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`);
  }
  return dates;
}

/** Random int between min and max inclusive */
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick random item from array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export async function seedDemoData(): Promise<string[]> {
  const logs: string[] = [];
  const date = today();
  const seedKey = `DemoSeeded`;

  const already = await redis.get(seedKey);
  if (already) {
    return ['Demo data already seeded. Delete DemoSeeded key to re-seed.'];
  }

  // ── 1. Mood aggregates for last 7 days ──
  const moodKeys = ['happy', 'sad', 'angry', 'excited', 'tired', 'anxious', 'chill', 'chaotic', 'hopeful', 'meh', 'loved', 'cooked', 'nostalgic', 'adventurous'];
  for (const d of lastDays(7)) {
    const kv: Record<string, string> = {};
    const total = rand(20, 80);
    let remaining = total;
    const used = new Set<string>();
    const count = rand(3, 5);
    for (let i = 0; i < count && remaining > 0; i++) {
      const mood = pick(moodKeys.filter(m => !used.has(m)));
      used.add(mood);
      const votes = i === count - 1 ? remaining : rand(1, remaining - (count - i - 1));
      remaining -= votes;
      kv[mood] = String(votes);
    }
    if (Object.keys(kv).length > 0) {
      await redis.hSet(`MoodAggregate:${d}`, kv);
    }
  }
  logs.push('Seeded 7 days of mood aggregates');

  // ── 2. Canvas pixels (smiley face pattern: 8x8 grid) ──
  const smileyPixels: [number, number, string][] = [
    [2, 2, '#000000'], [3, 2, '#000000'], [5, 2, '#000000'], [6, 2, '#000000'],
    [1, 4, '#000000'], [7, 4, '#000000'],
    [2, 6, '#000000'], [3, 6, '#000000'], [4, 6, '#000000'], [5, 6, '#000000'], [6, 6, '#000000'],
  ];
  const canvasDate = today();
  const pixelMap: Record<string, string> = {};
  for (const [x, y, color] of smileyPixels) {
    pixelMap[`pixel:${x}:${y}`] = JSON.stringify({ x, y, color, userId: 'demo_user_smile' });
  }
  await redis.hSet(`Canvas:${canvasDate}`, pixelMap);
  logs.push('Seeded canvas with smiley face (11 pixels)');

  // ── 3. Confession feed for today ──
  const fakeConfessions = [
    { userId: 'demo_alice', text: 'I pretend to know what I\'m doing at work but honestly I just Google everything and hope nobody notices', timestamp: Date.now() - 3600000 },
    { userId: 'demo_bob', text: 'I still sleep with a stuffed animal and I\'m 34 years old. No regrets.', timestamp: Date.now() - 2700000 },
    { userId: 'demo_carol', text: 'I\'ve been using the same password since 2012 because I\'m too lazy to update everything', timestamp: Date.now() - 1800000 },
    { userId: 'demo_dave', text: 'Sometimes I rewatch shows I\'ve seen 5 times instead of trying new ones. Comfort zone is real.', timestamp: Date.now() - 900000 },
    { userId: 'demo_eve', text: 'I told my boss I was sick today. I\'m not sick. I just wanted to finish this game.', timestamp: Date.now() - 300000 },
  ];
  await redis.set(`ConfessionFeed:${date}`, JSON.stringify(fakeConfessions));
  logs.push('Seeded 5 confession feed entries');

  // ── 4. Hall of Fame (prompt counts) ──
  await redis.hSet('PromptCounts:all', {
    demo_creator1: '12',
    demo_creator2: '9',
    demo_creator3: '7',
    demo_creator4: '5',
    demo_creator5: '3',
  });
  logs.push('Seeded Hall of Fame with 5 contributors');

  // ── 5. User stats (streak + badges) ──
  // This gets read per-user so it only shows for this demo userId
  // Uses JSON STRING format matching getUserStats() in api.ts (NOT HASH)
  // Pro Brain [C1]: seed.ts wrote HASH, api.ts reads STRING — mismatch caused silent data loss
  const demoUserId = 'demo_player';
  await redis.set(`UserStats:${demoUserId}`, JSON.stringify({
    streakDays: 7,
    badges: ['3-day', '7-day'],
    lastPlayedDate: date,
    roleTier: 'user',
  }));
  logs.push('Seeded user stats (7-day streak, 2 badges)');

  await redis.set(seedKey, '1');
  logs.push('Demo seeding complete!');

  return logs;
}
