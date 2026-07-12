// ---------------------------------------------------------------------------
// Shared comment-formatting utilities.
// Every function here is pure and works with plain markdown + monospace code
// blocks — the only rendering surface Reddit comments support.
// ---------------------------------------------------------------------------

import type { ArcadeResults, WeeklyRecap } from './api';

// ---------------------------------------------------------------------------
// §4.3 — Reusable component snippets
// ---------------------------------------------------------------------------

/**
 * Monospace progress bar using full-block (█) and light-block (░) glyphs.
 * Always call this INSIDE a fenced code block, never bare in the comment body.
 *
 * @param pct  Percentage 0–100
 * @param width  Total character width of the bar (default 30)
 */
export function bar(pct: number, width = 30): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const filled = Math.round((clamped / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

/**
 * Streak badge — plain text, safe outside code fences.
 * Shows up to 3 fire emoji + the day count.
 */
export function streakBadge(days: number): string {
  const fireCount = Math.min(Math.max(0, days), 3);
  const fires = '🔥'.repeat(fireCount);
  const label = `${days}-day streak`;
  return fires ? `${fires}  ${label}` : `0-day streak — time to start!`;
}

/**
 * Spoiler-wrap for secondary content with a link.
 * Renders as hidden text on all Reddit surfaces.
 */
export function spoiler(label: string, url: string): string {
  return `>!${label}!< [Open —>](${url})`;
}

// ---------------------------------------------------------------------------
// Hero fact — picks the single most interesting result
// ---------------------------------------------------------------------------

function heroFact(results: ArcadeResults): string {
  if (results.pixelPlaced) {
    return `Placed pixel at (${results.pixelPlaced.x}, ${results.pixelPlaced.y})`;
  }
  if (results.hotTakeVote) {
    const labels: Record<string, string> = { agree: 'Agree', disagree: 'Disagree', unsure: 'Unsure' };
    return `Vote locked in: ${labels[results.hotTakeVote] ?? results.hotTakeVote}`;
  }
  if (results.template && results.template.score > 0) {
    return `Bingo: ${results.template.score}/9 squares`;
  }
  if (results.mood) {
    return `${results.mood.emoji}  ${results.mood.label}`;
  }
  return 'Completed today\'s arcade';
}

// ---------------------------------------------------------------------------
// Streak motivation line
// ---------------------------------------------------------------------------

function streakLine(days: number): string {
  if (days === 0) return 'Your first day! Come back tomorrow to start a streak.';
  const fires = '🔥'.repeat(Math.min(days, 3));
  let motivation: string;
  if (days < 3) {
    motivation = `One more day ${days === 1 ? 'unlocks your first badge!' : 'keeps it going!'}`;
  } else if (days < 7) {
    motivation = `You're building momentum. Almost at the week milestone.`;
  } else if (days === 7) {
    motivation = 'A full week! You\'re unstoppable.';
  } else {
    motivation = 'Incredible dedication.';
  }
  return `${fires}  ${days}-day streak. ${motivation}`;
}

// ---------------------------------------------------------------------------
// §4.1 — Tier 1: per-user receipt comment
// ---------------------------------------------------------------------------

/**
 * Formats the full comment body for the per-user result receipt.
 * One hero fact, one streak line, one hook + link, one signature line.
 */
export function formatReceipt(
  results: ArcadeResults,
  subredditName: string,
  postId: string,
): string {
  const hero = heroFact(results);
  const streak = streakLine(results.streakDays);
  const postUrl = `https://reddit.com/r/${subredditName}/comments/${postId}`;

  const lines: string[] = [
    `**${hero}**`,
    '',
    streak,
    '',
    `Curious where the room landed? [See today's board —>](${postUrl})`,
    '',
    `^(story-arcade) ^(·) ^(r/${subredditName}) ^(·) ^(voting closes at reset)`,
  ];

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// §4.2 — Tier 2: weekly recap share comment
// ---------------------------------------------------------------------------

const personalityDescriptions: Record<string, string> = {
  'The Optimist': 'You see the bright side — even when things are on fire.',
  'The Radiant Regular': 'You show up with good vibes every single day. Legendary.',
  'The Deep Thinker': 'You feel things deeply. That\'s a superpower, not a weakness.',
  'The Brooding Mastermind': 'Brooding with a plan. You\'re 3 steps ahead of everyone.',
  'The Firebrand': 'You\'ve got passion. Channel it into something unstoppable.',
  'The Fired Up': 'You came back angry and you came to win. Respect.',
  'The Enthusiast': 'Your energy is contagious. Never let anyone dim it.',
  'The Hype Architect': 'You don\'t just bring hype — you build it from the ground up.',
  'The Survivor': 'You\'re still standing. That counts for everything.',
  'The Committed Exhausted': 'Tired but here. That\'s the definition of dedication.',
  'The Spiral Surfer': 'You ride the waves of anxiety like a pro. Somehow.',
  'The Zen Master': 'Unbothered. Moisturized. In your lane. Thriving.',
  'The Gremlin': 'Chaos is a ladder, and you\'re climbing it.',
  'The Dreamer': 'Manifesting, believing, achieving. The whole package.',
  'The Believer': 'You keep the faith. Even when the wifi drops.',
  'The Indifferent': 'You\'re just here to vibe. No notes.',
  'The Heartfelt': 'Out here catching feelings and winning hearts.',
  'The Well-Done': 'You\'ve been through it. Came out seasoned.',
  'The Time Traveler': 'Living in the past? It\'s called ✨aesthetic✨.',
  'The Explorer': 'New experiences or bust. You\'re gonna need a bigger passport.',
  'The Completionist': '7 out of 7 days. You don\'t miss. Ever.',
  'The Story Arcadian': 'You\'re writing your own story. Keep going.',
  'The Newcomer': 'Fresh meat. We love to see it.',
};

export function formatWeeklyRecap(
  recap: WeeklyRecap,
  subredditName: string,
  postId: string,
): string {
  const desc = personalityDescriptions[recap.personalityLabel] ?? 'You are one of a kind.';
  const postUrl = `https://reddit.com/r/${subredditName}/comments/${postId}`;

  const daysBar = bar(Math.round((recap.totalDaysPlayed / 7) * 100), 20);

  const lines: (string | null)[] = [
    `**📊 My Week in Story Arcade**`,
    '',
    `\`\`\``,
    `Personality:  ${recap.personalityLabel}`,
    `"${desc}"`,
    ``,
    `Days played:  ${daysBar}  ${recap.totalDaysPlayed}/7`,
    recap.dominantMood
      ? `Vibe check:   ${recap.dominantMood.emoji} ${recap.dominantMood.label} (${recap.dominantMood.pct}%)`
      : null,
    recap.topChoice
      ? `Top choice:   ${recap.topChoice.chosenSide}`
      : null,
    `Streak:       ${'🔥'.repeat(Math.min(recap.streakDays, 5))} ${recap.streakDays} day${recap.streakDays !== 1 ? 's' : ''}`,
    `\`\`\``,
    '',
    `[See today's board —>](${postUrl})`,
    '',
    `^(story-arcade) ^(·) ^(r/${subredditName}) ^(·) ^(week of ${recap.weekEnding})`,
  ];

  return lines.filter((l): l is string => l !== null).join('\n');
}
