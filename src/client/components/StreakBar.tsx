type Props = {
  streakDays: number;
  badges: string[];
};

export const StreakBar = ({ streakDays, badges }: Props) => {
  const fireEmoji = streakDays > 0 ? '🔥'.repeat(Math.min(streakDays, 5)) : '💤';
  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm ${streakDays > 0 ? 'animate-pulse' : ''}`}>{fireEmoji}</span>
      <span className="text-sm font-bold text-amber-700">{streakDays}</span>
      {badges.length > 0 && (
        <div className="flex gap-0.5">
          {badges.includes('30-day') && <span className="text-xs" title="30-day streak">🏆</span>}
          {badges.includes('7-day') && <span className="text-xs" title="7-day streak">⭐</span>}
          {badges.includes('3-day') && <span className="text-xs" title="3-day streak">✨</span>}
        </div>
      )}
    </div>
  );
};
