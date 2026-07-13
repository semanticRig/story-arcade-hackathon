# data_model.md — Redis schema

All keys are namespaced by app; dates are YYYY-MM-DD (UTC).

DailyConfig:{date}          → JSON { mood: {...}, questions: [...], template: {...}, confession: {...} }
UserStats:{userId}          → JSON { streakDays, lastPlayedDate, badges: string[], roleTier }
MoodAggregate:{date}        → HASH { moodKey: count }
ChoiceAggregate:{date}:{questionId} → HASH { optionId: count }
TemplateAggregate:{date}:{templateId} → HASH { cellId: count }
ConfessionAggregate:{date}:{confessionId} → HASH { tagKey: count }
PromptSubmission:{id}       → JSON { id, userId, type, payload, status } , status ∈ pending|approved|rejected
PromptQueue                 → LIST of approved PromptSubmission ids, consumed FIFO by the daily cron job

Rules:
- Never store PII beyond Reddit userId (already pseudonymous).
- Aggregates are write-heavy, read-cached per request — increment via HINCRBY, never read-modify-write full objects.
- UserStats reads happen once per daily-config call; keep the object small (<1KB).
