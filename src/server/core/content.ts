import { reddit, redis } from '@devvit/web/server';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

// (option pools removed — now using real Reddit comments)

// ---------------------------------------------------------------------------
// Bingo fillers — split by tone for consistency
// ---------------------------------------------------------------------------

type BingoFillerTone = 'light' | 'darkHumor' | 'wholesome';

interface BingoFiller { text: string; tone: BingoFillerTone }

const BINGO_FILLERS: BingoFiller[] = [
  // Light/casual (20 tiles)
  { text: 'Drinking coffee at 4pm', tone: 'light' },
  { text: 'Scrolling Reddit instead of sleeping', tone: 'light' },
  { text: 'Canceling plans to stay home', tone: 'light' },
  { text: 'Saying "just one more episode"', tone: 'light' },
  { text: 'Forgetting why I walked into a room', tone: 'light' },
  { text: 'Burning my mouth on pizza', tone: 'light' },
  { text: 'Tripping over nothing', tone: 'light' },
  { text: 'Losing my phone while holding it', tone: 'light' },
  { text: 'Checking the fridge for the 5th time', tone: 'light' },
  { text: 'Laughing at my own joke', tone: 'light' },
  { text: 'Staring at the wall for 10 minutes', tone: 'light' },
  { text: 'Saying "I\'ll do it tomorrow"', tone: 'light' },
  { text: 'Pretending to know what I\'m doing', tone: 'light' },
  { text: 'Eating the same meal for the 3rd time', tone: 'light' },
  { text: 'Re-heating the same coffee twice', tone: 'light' },
  { text: 'Typing a message and never sending it', tone: 'light' },
  { text: 'Walking into a room and forgetting why', tone: 'light' },
  { text: 'Saving a post to "read later"', tone: 'light' },
  { text: 'Zoning out in the middle of a task', tone: 'light' },
  { text: 'Picking at a loose thread mindlessly', tone: 'light' },
  // Dark humor / relatable cringe (16 tiles)
  { text: 'Reliving a cringe memory at 3am', tone: 'darkHumor' },
  { text: 'Oversharing with a stranger', tone: 'darkHumor' },
  { text: 'Having a full conversation in my head', tone: 'darkHumor' },
  { text: 'Sending a screenshot to the wrong person', tone: 'darkHumor' },
  { text: 'Adding things to my cart and never buying', tone: 'darkHumor' },
  { text: 'Typing a reply and deleting it', tone: 'darkHumor' },
  { text: 'Taking a nap as a coping mechanism', tone: 'darkHumor' },
  { text: 'Overthinking a text message', tone: 'darkHumor' },
  { text: 'Googling something embarrassing', tone: 'darkHumor' },
  { text: 'Replying to a text in my head only', tone: 'darkHumor' },
  { text: 'Practicing a conversation in the shower', tone: 'darkHumor' },
  { text: 'Checking ex social media at 2am', tone: 'darkHumor' },
  { text: 'Laughing nervously at a serious moment', tone: 'darkHumor' },
  { text: 'Saying "I\'m fine" when I\'m not', tone: 'darkHumor' },
  { text: 'Spacing out mid-conversation', tone: 'darkHumor' },
  { text: 'Waking up before the alarm and stressing', tone: 'darkHumor' },
  // Wholesome (10 tiles)
  { text: 'A compliment that made my whole week', tone: 'wholesome' },
  { text: 'A genuine compliment from a stranger', tone: 'wholesome' },
  { text: 'Finding money in an old jacket', tone: 'wholesome' },
  { text: 'A random act of kindness', tone: 'wholesome' },
  { text: 'Getting a text from an old friend', tone: 'wholesome' },
  { text: 'A stranger holding the door', tone: 'wholesome' },
  { text: 'Finding the perfect song for the moment', tone: 'wholesome' },
  { text: 'A pet doing something ridiculous', tone: 'wholesome' },
  { text: 'Someone remembering a small detail about you', tone: 'wholesome' },
  { text: 'Waking up before the alarm feeling rested', tone: 'wholesome' },
];

/** Heuristic: does text read like a question? (e.g. "Anyone else X?" or "Hot take: Is X good?") */
function isQuestionPhrased(text: string): boolean {
  const t = text.trim();
  // Contains a question mark
  if (/[?？]/.test(t)) return true;
  // Starts with a question word
  if (/^(would|should|could|can|did|does|do|are|is|was|were|how|why|what|who|where)/i.test(t)) return true;
  // Starts with "anyone" or "everyone" — usually followed by a question
  if (/^(anyone|anybody|everyone|everybody)\b/i.test(t)) return true;
  // Contains "does anyone" pattern
  if (/\bdoes\s+anyone\b/i.test(t)) return true;
  return false;
}

/** Heuristic: flag content that might be dark/morbid for a casual bingo card */
function isDarkOrMorbid(text: string): boolean {
  const lower = text.toLowerCase();
  const risky = [
    'death', 'die', 'suicid', 'kill', 'murder', 'hate (someone|myself)',
    'depress', 'crying alone', 'nobody cares', 'no one loves', 'end my life',
    'self harm', 'self-harm', 'cutting', 'overdose',
  ];
  return risky.some(r => new RegExp(r, 'i').test(lower));
}

/** Heuristic: flag tiles that are meta/subreddit-specific or unlikely to apply. */
function isBingoIrrelevant(text: string): boolean {
  const t = text.trim();
  // Subreddit references (r/x)
  if (/^r\/\w+/i.test(t)) return true;
  // Moderator/admin announcements
  if (/\b(looking for|hiring|wanted|seeking)\s+(new\s+)?(mod|moderator)/i.test(t)) return true;
  // "[deleted]" / "[removed]" placeholders
  if (/^\[(deleted|removed)\]$/i.test(t)) return true;
  // Specific personal stories starting with "I" + past tense verb (hard to check for everyone)
  if (/^i\s+(witnessed|heard|saw|found|discovered|caught|noticed|watched|noticed)\b/i.test(t)) return true;
  return false;
}

/** Select bingo cells with consistent tone. Prefers curated fillers first, supplements with Reddit posts. */
function selectBingoTiles(convoPool: string[], date: string, count: number): string[] {
  const daySeed = (new Date(date).getTime() / 86400000) | 0;
  // Pick a tone for the day: light, darkHumor, or wholesome (seeded rotation)
  const tones: BingoFillerTone[] = ['light', 'darkHumor', 'wholesome', 'light', 'darkHumor'];
  const tone = tones[daySeed % tones.length]!;

  const result: string[] = [];

  // Step 1: Pick at most 3 curated fillers (guaranteed quality, leaves room for Reddit)
  const matchingFillers = BINGO_FILLERS.filter(f => f.tone === tone);
  const curatedCount = Math.min(3, Math.ceil(count / 3));
  const ordered = pickNByDate(matchingFillers, date, curatedCount);
  for (const f of ordered) {
    if (isBingoIrrelevant(f.text)) continue;
    if (!result.includes(f.text)) result.push(f.text);
  }

  // Step 2: Fill remaining slots with Reddit posts (showerthoughts / AskReddit)
  for (const t of convoPool) {
    if (result.length >= count) break;
    const short = t.length > 72 ? t.slice(0, 69) + '...' : t;
    if (isQuestionPhrased(short) || isDarkOrMorbid(short) || isBingoIrrelevant(short)) continue;
    if (!result.includes(short)) result.push(short);
  }

  // Step 3: If Reddit pool was empty, fill remaining with more curated fillers
  if (result.length < count) {
    const remaining = matchingFillers.filter(f => !result.includes(f.text));
    for (const f of remaining) {
      if (result.length >= count) break;
      if (isBingoIrrelevant(f.text)) continue;
      result.push(f.text);
    }
  }

  return result.slice(0, count);
}

// ---------------------------------------------------------------------------
// Mood options — rotating pool to keep things fresh
// ---------------------------------------------------------------------------

const MOOD_POOL: { key: string; emoji: string; label: string }[] = [
  { key: 'happy', emoji: '😊', label: "I'm on top of the world" },
  { key: 'sad', emoji: '😔', label: "I'm a hot mess" },
  { key: 'angry', emoji: '😡', label: "I'm low-key furious" },
  { key: 'excited', emoji: '🤩', label: "I'm hella hyped" },
  { key: 'tired', emoji: '😴', label: "I'm running on fumes" },
  { key: 'anxious', emoji: '😬', label: "I'm spiraling a little" },
  { key: 'chill', emoji: '😌', label: "I'm in my zen era" },
  { key: 'chaotic', emoji: '🤪', label: "I'm unhinged today" },
  { key: 'hopeful', emoji: '🌟', label: "I'm manifesting greatness" },
  { key: 'meh', emoji: '😐', label: "I'm feeling nothing" },
  { key: 'loved', emoji: '💖', label: "I'm surrounded by love" },
  { key: 'cooked', emoji: '🥴', label: "I'm so cooked" },
  { key: 'nostalgic', emoji: '📼', label: "I'm stuck in the good old days" },
  { key: 'adventurous', emoji: '🌍', label: "I'm itching for something new" },
];

// ---------------------------------------------------------------------------
// Fallback pools — used when Reddit API returns nothing. Date-seeded so
// they rotate daily even without network data.
// ---------------------------------------------------------------------------

const FALLBACK_QUESTIONS = [
  'Would you rather have unlimited time or unlimited energy',
  'What\'s the best thing that happened to you this week',
  'What\'s a skill you wish you had',
  'What\'s your go-to comfort food',
  'What\'s the most underrated movie you\'ve seen',
  'What\'s a simple pleasure that always makes your day better',
  'What\'s the worst trend you\'ve witnessed',
  'What\'s a book that actually changed how you think',
  'What\'s your favorite way to waste time',
  'What\'s something you believed as a kid that turned out to be false',
  'What\'s the best piece of advice you\'ve ever gotten',
  'What\'s a small win you\'re proud of today',
  'What\'s the most fascinating thing you learned recently',
  'Recommend a podcast that more people should know about',
  'What\'s your unpopular opinion about food',
  'What\'s the best life hack you actually use',
  'What\'s a memory that always makes you smile',
  'What\'s the most useless talent you have',
  'What\'s something expensive that\'s totally worth the price',
  'What\'s the most beautiful place you\'ve ever been',
];

const FALLBACK_CONFESSIONS = [
  'I told my boss I was sick but I was actually at a concert. Worth it.',
  'I pretend to understand adulting every single day and nobody has caught on yet.',
  'I\'ve been wearing the same socks for three days. Don\'t judge me.',
  'I laughed at a funeral once. I still think about it at 3am.',
  'I rehearse conversations in the shower and then never have them.',
  'I said "you too" when the waiter said "enjoy your meal." I can never go back.',
  'I Googled how to make friends in my 20s. The results were not helpful.',
  'I pretend to like networking events but I\'m actually just there for the free food.',
  'I still talk to my plants more than most humans.',
  'I\'ve been humming the same song for three days and I don\'t know where it\'s from.',
  'I once called my teacher "mom" in front of the whole class.',
  'I practice conversations I\'ll never have in the car.',
  'I\'ve replayed a 10-second interaction for 3 years straight.',
  'I pretend to understand movie plots so people think I\'m smart.',
  'I still have a gift I bought for someone months ago that I never gave them.',
  'I\'ve laughed at a notification vibration that was just my own phone.',
  'I\'ve eaten food off the floor when nobody was watching.',
  'I waved back at someone who was waving at the person behind me.',
  'I\'ve blamed a fart on a chair creak. More than once.',
  'I said "love you too" to a customer service rep on the phone.',
];

const FALLBACK_HOT_TAKES = [
  'Pineapple belongs on pizza and I\'ll die on this hill.',
  'The original is almost always better than the remake.',
  'Social media was a mistake.',
  'Cash is still king — digital payments are overrated.',
  'Breakfast for dinner is the best meal category.',
  'Cold weather > hot weather. You can always put on more clothes.',
  'The best episode of a show is always the season 1 finale.',
  'Prequels ruin the mystery — stop making them.',
  'Multitasking is a myth. You\'re just doing multiple things poorly.',
  'The 5-second rule is valid and I stand by it.',
  'A movie with a 6/10 on IMDb is usually more fun than a 9/10.',
  'The best conversations happen after midnight.',
];

/** Deterministic pick from a pool: same pool + same date = same result. */
function pickByDate<T>(pool: T[], date: string): T {
  const daySeed = (new Date(date).getTime() / 86400000) | 0;
  const hash = Math.abs(pool.length * Math.sin(daySeed * 13.37)) | 0;
  return pool[hash % pool.length]!;
}

/** Collect a subset from a pool, seeded by date, without replacement. */
function pickNByDate<T>(pool: T[], date: string, n: number): T[] {
  const sorted = [...pool];
  const daySeed = (new Date(date).getTime() / 86400000) | 0;
  // Fisher-Yates shuffle seeded by date
  for (let i = sorted.length - 1; i > 0; i--) {
    const pseudoRandom = Math.abs((daySeed * 13.37 + i * 7.11) * 1000) | 0;
    const j = pseudoRandom % (i + 1);
    const tmp = sorted[i] as T;
    sorted[i] = sorted[j] as T;
    sorted[j] = tmp;
  }
  return sorted.slice(0, Math.min(n, sorted.length));
}

/** Pick 5 mood options for a given date. Seeded by date so the day is consistent. */
export function generateMoodOptions(date: string): { key: string; emoji: string; label: string }[] {
  const dayOfYear = (new Date(date).getTime() / 86400000) | 0;
  const sorted = [...MOOD_POOL].sort((a, b) => {
    const ha = (a.key.charCodeAt(0) + dayOfYear) % MOOD_POOL.length;
    const hb = (b.key.charCodeAt(0) + dayOfYear) % MOOD_POOL.length;
    return ha - hb;
  });
  return sorted.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Options from real Reddit comments + user input
// ---------------------------------------------------------------------------

const CUSTOM_ANSWER_LABEL = 'Write your own answer…';
const FALLBACK_OPTIONS = [
  ['Upvoted this', 'Downvoted this', CUSTOM_ANSWER_LABEL],
  ['Hard agree', 'Hard disagree', CUSTOM_ANSWER_LABEL],
  ['Same here', 'Not me', CUSTOM_ANSWER_LABEL],
];

/** Build options from real Reddit comments, with a 3rd "write your own" slot. */
async function buildQuestionOptions(postId: string, date: string, index: number): Promise<{ id: string; text: string }[]> {
  const prefix = `q_${date}_${index + 1}`;
  const letters = ['a', 'b', 'c'];

  // Fetch top 2 real comments
  const comments = await fetchTopComments(postId);

  if (comments.length >= 2) {
    return [
      { id: `${prefix}a`, text: comments[0]!.slice(0, 120) },
      { id: `${prefix}b`, text: comments[1]!.slice(0, 120) },
      { id: `${prefix}c`, text: CUSTOM_ANSWER_LABEL },
    ];
  }

  if (comments.length === 1) {
    return [
      { id: `${prefix}a`, text: comments[0]!.slice(0, 120) },
      { id: `${prefix}b`, text: 'Write your own answer…' },
    ];
  }

  // No comments at all — use static fallback
  const fallbackSet = FALLBACK_OPTIONS[index % FALLBACK_OPTIONS.length]!;
  return fallbackSet.map((text, i) => ({
    id: `${prefix}${letters[i] ?? 'x'}`,
    text,
  })).filter(o => o.text.length > 0);
}

// ---------------------------------------------------------------------------
// Rate limit helper — Devvit Reddit API has low rate limits in dev env
// ---------------------------------------------------------------------------
async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/** Fetch hot post titles + IDs from a subreddit. Retries on rate limits. */
async function fetchPostTitles(subreddit: string, limit: number): Promise<{ title: string; postId: string }[]> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const listing = await reddit.getHotPosts({ subredditName: subreddit, limit, pageSize: limit });
      const posts = await listing.all();
      return posts
        .filter(p => p.title && p.title.length > 5 && p.title.length < 150)
        .map(p => ({ title: p.title!, postId: p.id }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < 3 && (msg.includes('rate') || msg.includes('429') || msg.includes('limit') || msg.includes('Too Many'))) {
        console.log(`[backoff] r/${subreddit} rate limited, retry ${attempt}/3 in ${attempt * 2}s`);
        await sleep(attempt * 2000);
        continue;
      }
      console.error(`[fetchPostTitles] r/${subreddit} failed:`, msg);
      return [];
    }
  }
  return [];
}

/** Fetch the most upvoted non-stickied non-removed comments from a post. Retries on rate limits. */
async function fetchTopComments(postId: string, limit = 5): Promise<string[]> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const listing = await reddit.getComments({
        postId: postId as `t3_${string}`,
        limit: 20,
        sort: 'top',
      });
      const all = await listing.all();
      return all
        .filter(c => {
          const body = c.body?.trim();
          if (!body || body.length < 3 || body.length > 200) return false;
          if (c.stickied || c.removed || c.distinguishedBy) return false;
          if (c.authorName?.toLowerCase() === 'automoderator') return false;
          return true;
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(c => c.body!.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < 3 && (msg.includes('rate') || msg.includes('429') || msg.includes('limit') || msg.includes('Too Many'))) {
        console.log(`[backoff] getComments rate limited, retry ${attempt}/3 in ${attempt * 2}s`);
        await sleep(attempt * 2000);
        continue;
      }
      console.error(`[fetchTopComments] Failed for post ${postId}:`, msg);
      return [];
    }
  }
  return [];
}

// ---------------------------------------------------------------------------
// Content Bank — daily-fetched pool to avoid repeated API calls
// ---------------------------------------------------------------------------

type ContentBankEntry = { title: string; postId: string };

/**
 * Build the content bank: fetch fresh posts from all sources and store in Redis.
 * Called once daily by the midnight rotation job.
 */
export async function buildContentBank(limit = 30): Promise<void> {
  console.log('[bank] Fetching content bank (sequential to avoid rate limits)…');

  // Fetch sequentially with delays to stay under rate limits
  const askReddit = await fetchPostTitles('AskReddit', limit);
  await sleep(500);
  const confessions = await fetchPostTitles('confession', 20);
  await sleep(500);
  const opinions = await fetchPostTitles('unpopularopinion', 20);
  await sleep(500);
  const showerThoughts = await fetchPostTitles('Showerthoughts', 50);

  await redis.set('ContentBank:AskReddit', JSON.stringify(askReddit));
  await redis.set('ContentBank:confession', JSON.stringify(confessions));
  await redis.set('ContentBank:unpopularopinion', JSON.stringify(opinions));
  await redis.set('ContentBank:Showerthoughts', JSON.stringify(showerThoughts));
  await redis.del('ContentBank:used');
  console.log(`[bank] Stored ${askReddit.length} AskReddit, ${confessions.length} confession, ${opinions.length} unpopularopinion, ${showerThoughts.length} Showerthoughts`);

  for (const key of ['ContentBank:AskReddit', 'ContentBank:confession', 'ContentBank:unpopularopinion', 'ContentBank:Showerthoughts']) {
    await redis.expire(key, 172800);
  }
}

/** Try to load from the content bank; return null if bank is empty/missing. */
async function loadContentBank(): Promise<{
  askReddit: ContentBankEntry[];
  confessions: ContentBankEntry[];
  opinions: ContentBankEntry[];
  showerThoughts: ContentBankEntry[];
} | null> {
  try {
    const [askRaw, confRaw, opinRaw, showerRaw] = await Promise.all([
      redis.get('ContentBank:AskReddit'),
      redis.get('ContentBank:confession'),
      redis.get('ContentBank:unpopularopinion'),
      redis.get('ContentBank:Showerthoughts'),
    ]);
    if (!askRaw || !confRaw || !opinRaw || !showerRaw) return null;
    return {
      askReddit: JSON.parse(askRaw) as ContentBankEntry[],
      confessions: JSON.parse(confRaw) as ContentBankEntry[],
      opinions: JSON.parse(opinRaw) as ContentBankEntry[],
      showerThoughts: JSON.parse(showerRaw) as ContentBankEntry[],
    };
  } catch {
    return null;
  }
}

/** Mark a post ID as used so it won't be picked again. */
async function markUsed(subreddit: string, postId: string): Promise<void> {
  // Append to used list — we reset it daily so it never grows unbounded
  const key = `ContentBank:used:${subreddit}`;
  const raw = await redis.get(key);
  const used: string[] = raw ? JSON.parse(raw) : [];
  used.push(postId);
  await redis.set(key, JSON.stringify(used));
  await redis.expire(key, 172800);
}

/** Filter out already-used entries from a bank array. */
function filterUsed(entries: ContentBankEntry[], used: string[]): ContentBankEntry[] {
  if (used.length === 0) return entries;
  const usedSet = new Set(used);
  return entries.filter(e => !usedSet.has(e.postId));
}

/** Load used IDs for a subreddit. */
async function loadUsed(subreddit: string): Promise<string[]> {
  try {
    const raw = await redis.get(`ContentBank:used:${subreddit}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Pick the best confession from multiple sources. Deduplicates and filters. */
function pickConfession(
  confessions: { title: string; postId: string }[],
  offmychest: { title: string; postId: string }[],
  date: string,
): string {
  const allTitles: string[] = [];

  // Merge both sources
  for (const src of [confessions, offmychest]) {
    for (const p of src) {
      const t = p.title?.trim();
      if (!t || t.length < 10 || t.length > 200) continue;
      if (allTitles.includes(t)) continue; // dedup
      allTitles.push(t);
    }
  }

  if (allTitles.length > 0) {
    // Pick a deterministic title based on date (same title all day)
    const idx = Math.abs(new Date(date).getTime() + allTitles.length) % allTitles.length;
    return allTitles[idx]!;
  }

  return pickByDate(FALLBACK_CONFESSIONS, date);
}

export async function generateDailyContent(): Promise<{
  mood: { options: { key: string; emoji: string; label: string }[] };
  questions: { id: string; question: string; options: { id: string; text: string }[] }[];
  template: { id: string; type: 'bingo'; title: string; cells: { id: string; text: string }[][] };
  confession: { id: string; text: string; tags: string[] };
  hotTake: { id: string; statement: string };
} | null> {
  const date = today();

  // ── Try content bank first (built at midnight, no repeated API calls) ──
  const bank = await loadContentBank();
  let askReddit: ContentBankEntry[];
  let confessions: ContentBankEntry[];
  let opinions: ContentBankEntry[];
  let showerThoughts: ContentBankEntry[];

  if (bank) {
    const usedAsk = await loadUsed('AskReddit');
    const usedConf = await loadUsed('confession');
    const usedOpin = await loadUsed('unpopularopinion');
    const usedShower = await loadUsed('Showerthoughts');
    askReddit = filterUsed(bank.askReddit, usedAsk);
    confessions = filterUsed(bank.confessions, usedConf);
    opinions = filterUsed(bank.opinions, usedOpin);
    showerThoughts = filterUsed(bank.showerThoughts, usedShower);
    console.log(`[bank] Using content bank — ${askReddit.length} AskReddit, ${confessions.length} confession, ${opinions.length} unpopularopinion, ${showerThoughts.length} Showerthoughts available after dedup`);
  } else {
    console.log('[bank] No content bank — direct fetching from Reddit API');
    const [fetchedAsk, fetchedConf, fetchedOpin, fetchedShower] = await Promise.all([
      fetchPostTitles('AskReddit', 15),
      fetchPostTitles('confession', 10),
      fetchPostTitles('unpopularopinion', 10),
      fetchPostTitles('Showerthoughts', 20),
    ]);
    askReddit = fetchedAsk!;
    confessions = fetchedConf!;
    opinions = fetchedOpin!;
    showerThoughts = fetchedShower!;
  }

  const questions: { id: string; question: string; options: { id: string; text: string }[] }[] = [];

  // Pick up to 2 AskReddit posts that look like questions
  const askPool = shuffle(askReddit.filter(p =>
    p.title.includes('?') || /\b(would|should|what|how|why)\b/i.test(p.title)
  ));
  for (let i = 0; i < Math.min(2, askPool.length); i++) {
    const post = askPool[i];
    if (!post) continue;
    let question = post.title;
    if (question.endsWith('?')) question = question.slice(0, -1);
    const options = await buildQuestionOptions(post.postId, date, i);
    questions.push({
      id: `q_${date}_${i + 1}`,
      question: question.trim(),
      options,
    });
    // Mark bank entry as used so it won't repeat
    if (bank) await markUsed('AskReddit', post.postId);
  }

  // Fallback: if fewer than 2 questions, fill with ultra-safe defaults
  while (questions.length < 2) {
    const fallbackQuestion = pickByDate(FALLBACK_QUESTIONS, `${date}_q_${questions.length}`);
    const fallbackSet = FALLBACK_OPTIONS[questions.length % FALLBACK_OPTIONS.length]!;
    const prefix = `q_${date}_${questions.length + 1}`;
    const letters = ['a', 'b', 'c'];
    const options = fallbackSet.map((text, i) => ({
      id: `${prefix}${letters[i] ?? 'x'}`,
      text,
    })).filter(o => o.text.length > 0);
    questions.push({
      id: `q_${date}_${questions.length + 1}`,
      question: fallbackQuestion,
      options,
    });
  }

  const confessionText = pickConfession(confessions, [], date);
  const confessionId = `conf_${date}`;
  // Mark used so this confession doesn't repeat tomorrow
  if (bank) {
    const match = bank.confessions.find(c => c.title === confessionText);
    if (match) await markUsed('confession', match.postId);
  }

  const hotTakeText = opinions[0]?.title ?? pickByDate(FALLBACK_HOT_TAKES, date);
  const hotTakeId = `hottake_${date}`;
  if (bank && opinions[0]) await markUsed('unpopularopinion', opinions[0].postId);

  // Bingo tiles: Showerthoughts (primary, better fit) + AskReddit (supplement)
  const bingoSource = shuffle([
    ...showerThoughts.filter(p => p.title.length > 5 && p.title.length < 72),
    ...askReddit.filter(p => p.title.length > 5 && p.title.length < 72),
  ]);
  const cellTexts = selectBingoTiles(bingoSource.map(p => p.title), date, 9);
  while (cellTexts.length < 9) cellTexts.push(`🌀 Day ${cellTexts.length + 1}`);

  cellTexts[4] = '🆓 Free space';

  const cells: { id: string; text: string }[][] = [
    [{ id: `${date}_b1`, text: (cellTexts[0] ?? 'Thing 1') }, { id: `${date}_b2`, text: (cellTexts[1] ?? 'Thing 2') }, { id: `${date}_b3`, text: (cellTexts[2] ?? 'Thing 3') }],
    [{ id: `${date}_b4`, text: (cellTexts[3] ?? 'Thing 4') }, { id: `${date}_b5`, text: (cellTexts[4] ?? 'Thing 5') }, { id: `${date}_b6`, text: (cellTexts[5] ?? 'Thing 6') }],
    [{ id: `${date}_b7`, text: (cellTexts[6] ?? 'Thing 7') }, { id: `${date}_b8`, text: (cellTexts[7] ?? 'Thing 8') }, { id: `${date}_b9`, text: (cellTexts[8] ?? 'Thing 9') }],
  ];

  const sourcesWithContent = [askReddit.length > 0, confessions.length > 0, opinions.length > 0, showerThoughts.length > 0].filter(Boolean).length;
  const gotContent = sourcesWithContent >= 2;

  console.log(`[reddit-gen] Content generated | questions: ${questions.length} | confession: ${confessionText !== ''} | hotTake: ${hotTakeText !== ''} | bingo from ${cellTexts.filter(t => t.length > 0 && !t.startsWith('🌀 Day ')).length}/${9} real tiles`);

  if (!gotContent) {
    console.log('[reddit-gen] Not enough Reddit content — returning null (fallback to defaults)');
    return null;
  }

  return {
    mood: {
      options: generateMoodOptions(date),
    },
    questions,
    template: {
      id: `bingo_${date}`,
      type: 'bingo',
      title: "Today's Life Bingo",
      cells,
    },
    confession: {
      id: confessionId,
      text: confessionText,
      tags: ['Relatable', 'WTF', 'Wholesome', 'Needs Therapy'],
    },
    hotTake: {
      id: hotTakeId,
      statement: hotTakeText,
    },
  };
}
