# build_roadmap.md

Status tracker — update the CURRENT PHASE line as you progress. Each phase has a clear
"done" bar; don't start the next phase until the current one's bar is met.

CURRENT PHASE: 7 (Buffer / iteration)

## Phase 1 — Scaffolding (Day 1-2)
Tasks: create Devvit Web app from React template, confirm playtest post loads, wire up
devvit.json with a placeholder scheduled job, set up Redis connection sanity check endpoint.
Done when: `npm run dev` produces a working playtest post showing "hello world" from a real
/api/ round trip.

## Phase 2 — Mood + Choice sections (Day 3-4)
Tasks: DailyArcadeScreen, MoodSection, ChoiceSection, GET /api/daily-config (hardcoded config
ok for now), POST /api/mood/submit, POST /api/choice/submit, aggregates in Redis.
Done when: a user can submit mood + one choice question and see live aggregate percentages.

## Phase 3 — Template section (Day 5-6)
Tasks: TemplateSection (bingo grid), POST /api/template/submit, TemplateAggregate + heatmap
rendering, basic UserStats.streakDays tracking wired into mood/choice submit handlers.
Done when: streak increments correctly across two consecutive playtest days (simulate by
manually adjusting lastPlayedDate in Redis).

## Phase 4 — Confessions + UGC (Day 7-8)
Tasks: ConfessionSection + majority reveal, SubmitPromptModal, POST /api/prompts/submit,
POST /api/prompts/moderate (manual/admin trigger is fine), PromptQueue consumption in the
daily cron job.
Done when: a submitted prompt can be approved and shows up as tomorrow's content.

## Phase 5 — Retention polish + visual identity (Day 9)
Tasks: badges/tiers derived from streakDays, StreakBar UI, apply design_principles.md visual
direction across all sections, mobile-responsive pass.
Done when: the app looks and feels distinct on a phone-sized viewport, no default-template look.

## Phase 6 — Submission packaging (Day 10-11)
Tasks: stand up demo subreddit, verify daily cron actually posts there, write README.md
(purpose, how to play, tech stack, retention/UGC mechanics), record <60s demo video, submit
Devpost entry (app listing URL + demo post + video).
Done when: Devpost submission form is fully filled and the demo post is publicly playable.

## Phase 7 — Buffer / iteration (Day 12)
Tasks: fix bugs surfaced by outside playtesters, tighten day-one content, optionally add one
"weekly recap" post summarizing aggregate mood trends.
