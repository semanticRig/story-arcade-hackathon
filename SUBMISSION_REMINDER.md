BEFORE SUBMISSION: Restore 24hr play-once-per-day lock + Submission dedup

## 1. Restore "already played today" lock

In src/client/components/DailyArcadeScreen.tsx:

After line: `const isStale = config.date !== todayDate;`
ADD: `const alreadyPlayed = config.userStats.lastPlayedDate === config.date;`

After that, BEFORE the return statement, ADD the full lock screen (copied below).

## 2. Restore submission dedup

In src/server/routes/api.ts, for ALL 4 submit handlers (mood, choice, template, confession),
add BEFORE the first hIncrBy call:

  const submittedKey = `UserSubmitted:${date}:${userId}:SECTION`;
  const alreadySubmitted = await redis.get(submittedKey);
  if (alreadySubmitted) return c.json<ErrorResponse>({ status: 'error', message: 'Already submitted today' }, 409);

(Replace SECTION with 'mood', 'choice', 'template', or 'confession')

---

## Already played lock screen code:

  if (alreadyPlayed && !allCompleted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-amber-50 dark:bg-gray-900 p-6 gap-4 text-center">
        <div className="text-5xl">🔥</div>
        <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-200">You've already played today!</h2>
        <p className="text-amber-600 dark:text-amber-400 text-sm max-w-xs">
          {config.userStats.streakDays > 0
            ? `Keep your ${config.userStats.streakDays}-day streak alive — come back tomorrow!`
            : 'Come back tomorrow for a fresh arcade.'}
        </p>
        {config.userStats.badges.length > 0 && (
          <div className="flex gap-2 text-2xl">
            {config.userStats.badges.includes('30-day') && <span title="30-day">🏆</span>}
            {config.userStats.badges.includes('7-day') && <span title="7-day">⭐</span>}
            {config.userStats.badges.includes('3-day') && <span title="3-day">✨</span>}
          </div>
        )}
        <p className="text-xs text-amber-400 mt-4">Next game resets at midnight UTC</p>
        <button
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-full mt-2 transition-colors"
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>
    );
  }

