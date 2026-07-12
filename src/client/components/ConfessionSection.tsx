import { useState } from 'react';
import type { Confession, ConfessionVoteResponse } from '../../shared/api';

type Props = {
  confession: Confession;
  onSubmit: (confessionId: string, tag: string) => Promise<ConfessionVoteResponse | null>;
};

export const ConfessionSection = ({ confession, onSubmit }: Props) => {
  const [voted, setVoted] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ConfessionVoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async (tag: string) => {
    if (voted || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await onSubmit(confession.id, tag);
    if (res) {
      setVoted(tag);
      setResult(res);
    } else {
      setError('Failed to submit tag. Try again?');
    }
    setSubmitting(false);
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-amber-100 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">
        Confession Corner
      </h2>
      <div className="bg-amber-50 dark:bg-gray-700 rounded-xl p-4 mb-3 italic text-sm border border-amber-100 dark:border-gray-600 dark:text-gray-300">
        "{confession.text}"
      </div>
      <p className="text-xs text-amber-500 dark:text-amber-400 mb-2">Tag this confession:</p>
      <div className="flex flex-wrap gap-2">
        {confession.tags.map((tag) => {
          const isSelected = voted === tag;
          return (
            <button
              key={tag}
              onClick={() => handleVote(tag)}
              disabled={!!voted}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-amber-400 text-white scale-105'
                  : voted
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 opacity-60'
                  : 'bg-amber-100 dark:bg-gray-600 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-gray-500 active:scale-95'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
      {submitting && !voted && (
        <p className="text-xs text-amber-400 text-center mt-2 animate-pulse">submitting...</p>
      )}
      {error && !voted && (
        <p className="text-xs text-red-500 text-center mt-2">{error}</p>
      )}
      {result && (
        <div className="flex justify-center mt-3 pt-2 border-t border-amber-100 dark:border-gray-700 animate-reveal-slide">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Community says: <span className="font-semibold">{result.majorityTag ?? 'Mixed'}</span>
            {' '}({result.totalVotes} votes)
          </p>
        </div>
      )}
    </section>
  );
};
