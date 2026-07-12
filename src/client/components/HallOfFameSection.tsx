import type { HallOfFameResponse } from '../../shared/api';

type Props = {
  data: HallOfFameResponse | null;
  loading: boolean;
};

export const HallOfFameSection = ({ data, loading }: Props) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-amber-200 dark:border-gray-700">
        <p className="text-xs text-amber-600 dark:text-amber-400 animate-pulse">
          Loading Hall of Fame...
        </p>
      </div>
    );
  }

  if (!data || data.entries.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-amber-200 dark:border-gray-700">
        <p className="text-xs text-amber-600 dark:text-amber-400">
          No prompts submitted yet. Be the first!
        </p>
      </div>
    );
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-amber-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">🏛️</span>
        <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
          Hall of Fame
        </h3>
      </div>
      <div className="space-y-1.5">
        {data.entries.map((entry, i) => (
          <div
            key={entry.displayName}
            className="flex items-center justify-between text-xs px-2 py-1 rounded-lg bg-amber-50 dark:bg-gray-700"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-amber-500 dark:text-amber-400 w-4 text-right">
                {medals[i] ?? `#${i + 1}`}
              </span>
              <span className="text-amber-900 dark:text-amber-200 truncate max-w-[140px]">
                {entry.displayName}
              </span>
            </div>
            <span className="font-mono text-amber-600 dark:text-amber-400">
              {entry.submissionCount} prompt{entry.submissionCount !== 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
