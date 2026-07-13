# Story-Arcade Comment Redesign — Agent Spec

**Read this whole file before writing code.** It contains verified platform constraints (not assumptions), a root-cause diagnosis of the current comment, concrete replacement templates, and a phased implementation plan. No clarification needed — execute in order.

---

## 0. The screenshot under review

App comment posted by `story-arcade` (Devvit app account, `OP` tag), on `r/story_arcade_dev`. Body packs: a mood reaction, a "Pixel (10, 9)" coordinate, a vote confirmation, a tag-poll result (#WTF, 2 votes), a streak counter, a bingo progress fraction (1/9), and two percentage bars ("Absolutely 50%", "Team yes 100%") — all separated by `‖` pipe glyphs and box-drawing-ish characters, outside any code block.

---

## 1. Root cause (not "it looks boring" — it's a rendering bug plus an information-architecture bug)

**1a. The alignment is broken by font, not by design.**
Every bar, pipe, and column in the screenshot is plain inline text. Reddit renders comment bodies in a proportional font. Proportional fonts give every character a different width, so `‖`, `▓`, `░`, and spaces never line up column-to-column — and they line up *differently* on old Reddit, new Reddit, and each mobile client, because each uses a different UI font stack. This is why the bars look jagged instead of like a progress bar. **This is fixable with zero design effort**: wrap anything meant to look like a grid, bar, or table in a fenced code block (triple backtick). Code blocks are rendered in a monospace font on every Reddit surface, so alignment is guaranteed everywhere at once.

**1b. Seven data points, zero hierarchy.**
Mood emoji, pixel coordinate, vote state, tag-poll result, streak, bingo fraction, two separate percentage bars — all given equal visual weight, all fired in one shot. Nothing tells the reader what's actually new or worth their attention. The fix is prioritization, not more decoration: one hero fact per comment, everything else either cut, deferred to a linked post, or hidden behind a spoiler tag for people who want it.

**1c. It reads as a bot ping, not a comment.**
Reddit's own Devvit docs are explicit about this pattern:

> "Auto-comments should be used to spark conversation in the post comments, but you should avoid lower-signal updates (e.g., level/progress pings)."

A pure stat dump ("here are your 6 numbers") is exactly the low-signal ping this guidance warns against. It doesn't invite a reply, so it just adds noise to the thread. The fix is to give every auto-comment a discussion hook — a question, a tease, a comparison to the room — not just a readout.

---

## 2. Ground-truth platform constraints (verified via Devvit docs / Reddit help center / current hackathon rules — do not deviate from these)

### 2a. What the comment API actually accepts
```ts
import { reddit } from '@devvit/web/server';

await reddit.submitComment({
  id: 't3_123456',   // or a t1_ comment id for a reply
  text: 'markdown string goes here',
  runAs: 'USER',     // or 'APP'
});
```
`text` is a **plain markdown string**. There is no Blocks/JSX, no custom component, no color, no font, no image tag support in a comment. Devvit's Blocks UI framework (`<vstack>`, `<hstack>`, `<zstack>`, `<text>`, `<button>`, `<icon>`, `<image>`) only exists for **Custom Posts / Interactive Posts** — never for comments. Any "professional UI" ambition for the comment itself has to happen entirely inside markdown. This is the hard ceiling for this task.

### 2b. The markdown dialect Reddit actually renders (GFM + Reddit extensions, with real gaps)
- Standard: `**bold**`, `*italic*`, `~~strikethrough~~`, `` `inline code` ``, fenced code blocks, blockquotes (`>`), ordered/unordered lists, headers (`#`), horizontal rules (`---`).
- Reddit-only additions: spoiler tags `>!hidden text!<`, and superscript via `^word` (prefer per-word carets; the parenthesized form `^(...)` misparses on old Reddit — avoid it).
- **Tables are supported** but keep them to **≤4 columns** — wider tables scroll awkwardly on mobile. Every table needs a proper `| --- |` separator row or it won't parse.
- **No inline image embedding in markdown-mode text.** `![alt](url)` does not render from an API-submitted `text` field — it either shows as a broken tag or a plain link. Don't design around an image appearing in the comment body.
- No task lists, no footnotes. Superscript is the closest thing Reddit has to a footnote/fine-print convention, and it's the idiomatic place for a bot signature line.
- Comment length cap: **10,000 characters** (not the binding constraint here — the binding constraint is attention, not space).

### 2c. Policy constraints (Responsible Builder Policy / Devvit Rules)
- **No spamming via automated comments** — includes posting identical or substantially similar content repeatedly. A per-vote auto-reply template needs enough variation (or a low enough trigger frequency) that it doesn't read as copy-paste spam across a thread.
- **No manipulating voting or karma mechanics.** Don't design anything that nudges/rewards upvoting the app's own comment.
- Real rate limits exist on the Reddit API regardless of how much *research* budget this doc was built with — design the comment-posting cadence (see §7) to stay well under them: one receipt-comment per user action, not one per stat change.

### 2d. Rendering environment fragmentation
Old Reddit, new Reddit web, and the official mobile apps all parse this dialect slightly differently, and none of them have a rich-text editor on mobile — everything mobile users see was either typed as raw markdown or, in this case, generated by the app. Design for the *lowest common denominator*: short lines, code fences for anything needing alignment, tables ≤4 columns, no reliance on precise spacing outside a code fence.

---

## 3. Design principles for the rewrite

1. **One hero fact, always.** The first line is the single thing this comment exists to tell the reader. Everything else is secondary.
2. **Monospace is the only real design surface.** If it needs to look like a bar, grid, or card — it goes inside a fenced code block. If it's a sentence, it doesn't.
3. **Progressive disclosure, not information dump.** Secondary stats go behind a spoiler tag (`>!...!<`) or a link to the full Custom Post, not inline at full weight.
4. **Every auto-comment sparks something.** A question, a comparison, a tease — not just a number.
5. **Restraint reads as professional.** Cutting five of seven data points is the redesign; it isn't a compromise.
6. **The "aesthetic" lives in typography, not emoji density.** A single well-placed emoji beats a row of five. Box-drawing characters (`┌─┐│└─┘`) and full/light block glyphs (`█`/`░`) inside a code fence read as a clean terminal-style readout — well suited to a monospace-only medium — rather than a sticker collage.

---

## 4. Replacement templates

### 4.1 Tier 1 — the per-user vote receipt (this replaces the screenshot)

This is what a single voter sees after they vote. One hero fact, one hook, one signature line.

````
**Vote locked in: Agree** — Day 9, *"Pixel (10, 9)"*

🔥 2-day streak. One more and you unlock the next badge.

Curious where the room landed? [See today's board →](https://reddit.com/link-to-custom-post)

^(story-arcade) ^(·) ^(r/story_arcade_dev) ^(·) ^(voting closes at reset)
````

Why this works: hero fact is bolded and first. Streak is the one secondary stat worth keeping (it's personal, motivating, and cheap to verify). The bingo fraction, tag-poll count, mood aggregate, and team percentages are all cut from the comment — they move to the Custom Post (§5), which is where markdown can't compete anyway. The link line is the "spark conversation" hook Devvit's guidance asks for. The superscript line is the idiomatic Reddit bot-signature convention — small, out of the way, still attributable.

### 4.2 Tier 2 — the daily digest (one comment per day, e.g. pinned mod/stickied comment or the top-level app comment on the daily thread — never per-user)

Use this only where a code block is earned by genuinely tabular content, and only once per prompt cycle (not once per vote).

````
**Day 9 Results — "Pixel (10, 9)"**

Your vote: **Agree**

```
TEAM CONSENSUS
Agree   ████████████████████░░░░░░░░░░  67%
#WTF    ██████░░░░░░░░░░░░░░░░░░░░░░░░  20%
Other   ████░░░░░░░░░░░░░░░░░░░░░░░░░░  13%

BINGO CARD   1 / 9 squares
STREAK       🔥🔥 2 days
```

>!Full leaderboard, bingo card art, and tomorrow's prompt teaser →!< [Open the dashboard](https://reddit.com/link-to-custom-post)

^(story-arcade) ^(·) ^(daily reset 00:00 UTC)
```
````

Why this works: the block-character bars only align because they're fenced — swap `▓`/`░` mixed with pipes (original) for consistent `█` (U+2588) / `░` (U+2591) pairs, which is the actual professional convention for terminal-style bars and reads correctly on every client. The spoiler tag hides the "go look at the real dashboard" pitch behind a tap, which respects readers who just want the headline. Table alternative (if you want rows instead of a code-block bar chart, keep it to ≤3 columns for mobile):

```
| Option | Votes | Share |
| --- | --- | --- |
| Agree | 201 | 67% |
| #WTF | 60 | 20% |
| Other | 39 | 13% |
```

### 4.3 Reusable component snippets (implement these as small pure functions, not hardcoded strings)

```ts
// Monospace bar — always call this INSIDE a fenced code block, never bare in the comment body.
function bar(pct: number, width = 30): string {
  const filled = Math.round((pct / 100) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

// Streak badge — plain text, safe outside code fences.
function streakBadge(days: number): string {
  return `${'🔥'.repeat(Math.min(days, 3))} ${days}-day streak`;
}

// Spoiler-wrap for secondary content.
function spoiler(label: string, url: string): string {
  return `>!${label}!< [Open →](${url})`;
}
```

---

## 5. Where the rest of the dashboard actually belongs

Everything cut from the comment in §4 (mood aggregate, pixel-grid state, tag-poll breakdown, full bingo card, team percentages) is real, valuable data — it just doesn't belong in a markdown string. It belongs in a **Custom Post** built with Devvit Blocks (`<vstack>`/`<hstack>`/`<zstack>`/`<text>`/`<image>`/`<button>`), which is the only Devvit surface that supports actual color, layout, imagery, and interactivity. Practical split:

- **Comment** = the personal, high-signal receipt (§4.1), posted once per user action, always with a link back to the post.
- **Custom Post** = the full living dashboard: bingo card, live percentages, mood heatmap, pixel grid — built with Blocks, refreshed via app state, and where an actual retro-terminal / high-craft visual identity (color, borders, a proper illustrated badge/logo) can exist, because Blocks isn't limited to a monospace font.
- The comment's job is to make someone click through to the post. The post's job is to be the dashboard. Don't try to make the comment do both — that's the exact overload that broke the original.

---

## 6. Anti-pattern checklist (do not do any of this)

- ☐ Don't put a bar, grid, or table character outside a fenced code block — it will misalign on at least one client.
- ☐ Don't fire more than one auto-comment per user per vote/action — batch or throttle to avoid the spam policy and rate limits.
- ☐ Don't post a pure stat dump with no question/hook/link — it reads as a low-signal ping, which Devvit's own docs flag.
- ☐ Don't design anything that rewards or nudges upvoting the app's own comment — that's a policy violation (vote manipulation).
- ☐ Don't rely on `![alt](url)` rendering inline — it won't, from an API-submitted comment.
- ☐ Don't build tables wider than ~4 columns — they degrade badly on mobile.
- ☐ Don't use `^(parenthesized multi-word)` superscript — it misparses on old Reddit; caret-per-word instead.
- ☐ Don't try to recreate the full dashboard inside the comment — that job belongs to the Custom Post (§5).

---

## 7. Implementation plan (phased, execute without further clarification)

**Phase 1 — Kill the current template.** Remove the pipe/glyph-table comment generator entirely. Replace with the Tier 1 template (§4.1) as the only per-vote auto-comment.

**Phase 2 — Cadence guard.** Add a check so a given user triggers at most one receipt-comment per prompt cycle, regardless of how many times they change their vote before reset. This satisfies both the spam policy and API rate limits.

**Phase 3 — Component functions.** Implement `bar()`, `streakBadge()`, `spoiler()` (§4.3) as shared utilities, unit-tested for width/edge cases (0%, 100%, >width rounding).

**Phase 4 — Daily digest (optional, Tier 2).** If a once-per-cycle summary comment is wanted (e.g., posted by the app itself at reset, not per-user), implement §4.2, gated to fire exactly once per prompt cycle.

**Phase 5 — Move the dashboard.** Audit what's currently crammed into the comment (bingo card, pixel grid, mood aggregate, full percentages) and confirm each has a home in the existing Custom Post. Anything that doesn't yet — build it there, not in markdown.

**Phase 6 — Cross-client QA.** Preview the final templates on old Reddit, new Reddit web, and at least one official mobile app before shipping — this is the only way to catch dialect differences (§2d).

---

## 8. Hackathon alignment

Current Devvit hackathon judging (per Reddit's own rules pages) scores on axes like **Polish** ("as close to publishable as possible, compliant with Devvit Rules"), **Reddit-y** (community identity, embracing the platform's own conventions), and **Delightful UX** ("easy and fun to uncover what the app has to offer"). This redesign scores better on all three specifically because it stops fighting the medium: it uses Reddit's actual formatting primitives (spoilers, superscript, fenced code) instead of faking a UI with pipes, and it moves genuine visual design work to the surface (Custom Post/Blocks) that's built for it. If the submission window is the one running through mid-July, prioritize Phases 1–3 first — they're the highest-visible-impact, lowest-effort changes, and they're what a judge will actually see when they open the post.

---

## 9. Sources

- Devvit Reddit API docs (`reddit.submitComment`, `reddit.submitCustomPost`) — reddit/devvit-docs, GitHub
- Devvit Blocks primitives (`vstack`/`hstack`/`zstack`/`text`/`button`/`icon`/`image`) — Devvit Blocks documentation
- Reddit Formatting Guide — Reddit Help Center
- Responsible Builder Policy (spam, karma/vote manipulation) — Reddit Help Center
- Current Devvit hackathon rules pages (Devpost) — Polish / Reddit-y / Delightful UX judging criteria
