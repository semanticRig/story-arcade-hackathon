// ---------------------------------------------------------------------------
// Shared comment-formatting utilities.
// Every function here is pure and works with plain markdown + monospace code
// blocks — the only rendering surface Reddit comments support.
// ---------------------------------------------------------------------------

import type { ArcadeResults, TemplateCell, WeeklyRecap } from './api';
import { PERSONALITY_DESCRIPTIONS } from './constants';
import { getArchetypeById } from './archetypes';

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
// §4.1 — Tier 1: per-user receipt comment (viral share-to-comment)
// ---------------------------------------------------------------------------

export interface ReceiptOpts {
  templateGrid?: TemplateCell[][];
  confessionAgreementPct?: number;
  confessionTotalVotes?: number;
  confessionText?: string;
  moodCommunityPct?: number;
  archetypeId?: string;
}

/**
 * Produces a rich, viral-worthy Reddit comment from the user's arcade results.
 * Designed to be scannable and identity-affirming — a social object people
 * want to share.
 */
export function formatReceipt(
  results: ArcadeResults,
  subredditName: string,
  opts: ReceiptOpts = {},
): string {
  const lines: string[] = [];

  // ── 1. Header — archetype / identity ──
  if (results.mood) {
    lines.push(`**Today's Story: ${results.mood.emoji} ${results.mood.label}**`);
  } else {
    lines.push(`**Today's Story: ??? Unknown Mood ???**`);
  }

  // Archetype badge — shows what the player IS
  if (opts.archetypeId) {
    const archetype = getArchetypeById(opts.archetypeId);
    if (archetype) {
      lines.push('');
      lines.push('```');
      lines.push(archetype.sprite);
      lines.push('```');
      lines.push(`**You are: ${archetype.emoji} ${archetype.name}** (Tier ${archetype.tier})`);
      lines.push(`> ${archetype.description}`);
    }
  }
  lines.push('');

  // ── 2. Bingo board visualization ──
  if (results.template && opts.templateGrid) {
    const checkedSet = new Set(results.template.cells);
    const gridLines = opts.templateGrid.map((row) =>
      row.map((cell) => (checkedSet.has(cell.id) ? '✅' : '⬜')).join(' '),
    );
    lines.push('```');
    lines.push(...gridLines);
    lines.push('```');
    lines.push('');
  }

  // ── 3. Confession with spoiler tag ──
  if (results.confession?.tag) {
    const tag = results.confession.tag;
    const pct = opts.confessionAgreementPct;
    const total = opts.confessionTotalVotes ?? results.confession.totalVotes;
    const countInfo = pct !== undefined ? ` (${pct}% of ${total} players agreed)` : '';
    lines.push(`>!${tag}!<${countInfo}`);

    const quoteText = results.confession.text ?? opts.confessionText;
    if (quoteText) {
      const truncated = quoteText.length > 140 ? `${quoteText.slice(0, 137)}...` : quoteText;
      lines.push(`*"${truncated}"*`);
    }
    lines.push('');
  }

  // ── 4. Hot Take & Canvas ──
  {
    const snippets: string[] = [];
    if (results.pixelPlaced) {
      snippets.push(`\u{1F5BC} Pixel placed at (${results.pixelPlaced.x}, ${results.pixelPlaced.y})`);
    }
    if (results.hotTakeVote) {
      const labels: Record<string, string> = { agree: 'Agree', disagree: 'Disagree', unsure: 'Unsure' };
      const emoji: Record<string, string> = { agree: '\u2705', disagree: '\u274C', unsure: '\u{1F937}' };
      const label = labels[results.hotTakeVote] ?? results.hotTakeVote;
      const e = emoji[results.hotTakeVote] ?? '';
      snippets.push(`${e} **${label}** on today's hot take`);
    }
    if (snippets.length > 0) {
      lines.push(snippets.join('  \u2502  '));
      lines.push('');
    }
  }

  // ── 5. Streak + Badge line ──
  if (results.streakDays > 0) {
    const fires = '\u{1F525}'.repeat(Math.min(results.streakDays, 7));
    const parts: string[] = [`${fires} ${results.streakDays}-day streak`];
    if (results.badges.length > 0) {
      parts.push(`${results.badges.length} badge${results.badges.length !== 1 ? 's' : ''}`);
    }
    lines.push(parts.join('  \u2022  '));
  } else {
    lines.push('Day 1 — start your streak tomorrow!');
  }
  lines.push('');

  // ── 6. Community context ──
  if (results.mood && opts.moodCommunityPct !== undefined) {
    lines.push(`Your mood matched ${opts.moodCommunityPct}% of the community today`);
    lines.push('');
  }

  // ── 7. Call to action ──
  lines.push(`[Play tomorrow's arcade \u2192](https://reddit.com/r/${subredditName})`);
  lines.push('');

  // ── 8. Signature line ──
  lines.push(`^(story-arcade) ^(\u00b7) ^(r/${subredditName}) ^(\u00b7) ^(today's arcade)`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// §4.2 — Tier 2: weekly recap share comment
// ---------------------------------------------------------------------------

export function formatWeeklyRecap(
  recap: WeeklyRecap,
  subredditName: string,
  postId: string,
): string {
  const desc = PERSONALITY_DESCRIPTIONS[recap.personalityLabel] ?? 'You are one of a kind.';
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
