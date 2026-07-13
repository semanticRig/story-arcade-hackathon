# architecture.md

## Components (client — src/client)
- DailyArcadeScreen — root screen. Calls GET /api/daily-config on mount, renders sections in order.
- MoodSection — emoji/slider input. POST /api/mood/submit on change. Shows aggregate after submit.
- ChoiceSection — this-or-that / would-you-rather. POST /api/choice/submit. Shows live % after vote.
- TemplateSection — bingo grid or "put a finger down" list. POST /api/template/submit. Shows personal
  score + community heatmap (color intensity per cell from aggregate counts).
- ConfessionSection — text + tag buttons (Relatable/WTF/Wholesome/Needs Therapy). POST /api/confession/vote.
  Reveals majority verdict once vote threshold is reached.
- StreakBar — reads streakDays/badges from GET /api/daily-config response (embedded UserStats).
- SubmitPromptModal — UGC form (type: choice | template | confession). POST /api/prompts/submit.

Render order is fixed: Mood → Choice → Template → Confession → (streak/badges always visible in header).

## Server endpoints (src/server)
All prefixed /api/, all require authenticated Reddit userId from Devvit context middleware.

- GET  /api/daily-config        → { date, mood, questions[], template, confession, userStats }
- POST /api/mood/submit          → body {moodKey} → updates MoodAggregate + UserStats.streak
- POST /api/choice/submit        → body {questionId, optionId} → updates ChoiceAggregate
- POST /api/template/submit      → body {templateId, cellIds[]} → updates TemplateAggregate, returns score
- POST /api/confession/vote       → body {confessionId, tag} → updates ConfessionAggregate
- POST /api/prompts/submit       → body {type, payload} → writes PromptSubmission (status=pending)
- POST /api/prompts/moderate     → (admin only) body {submissionId, action} → approve/reject, schedules into future DailyConfig

## Daily lifecycle (scheduled job in devvit.json)
1. Cron trigger (~midnight UTC or configured time) picks next queued/approved DailyConfig.
2. If queue is empty, falls back to a default rotation of seed content (never show nothing).
3. Creates new Reddit post with the Devvit Web app attached, sets it as "today's" config in Redis.
4. Old day's aggregates are frozen (read-only) for the recap/heatmap views.

## Streak logic (server-side, in mood/choice submit handlers)
- On any successful submit for the day: if UserStats.lastPlayedDate == yesterday → streak += 1
  elif lastPlayedDate == today → no-op (already counted) else → streak = 1 (reset).
- Badges are derived thresholds (3/7/30-day streak) computed on read, not stored redundantly.
