import { useState } from 'react';
import type { CommunityConfessionsResponse } from '../../shared/api';

type Props = {
  data: CommunityConfessionsResponse | null;
  loading: boolean;
  onSubmit: (text: string) => void;
  submitting: boolean;
};

export const LiveConfessionsFeed = ({ data, loading, onSubmit, submitting }: Props) => {
  const [inputText, setInputText] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = () => {
    if (!inputText.trim() || submitting) return;
    onSubmit(inputText.trim());
    setInputText('');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-amber-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">💬</span>
          <h3 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            Community Confessions
          </h3>
          {data && (
            <span className="text-[10px] text-amber-500 font-mono">{data.total} today</span>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-amber-600 dark:text-amber-400 underline"
        >
          {expanded ? 'Collapse' : 'See all'}
        </button>
      </div>

      {/* Submit box */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          placeholder="Drop your confession..."
          maxLength={500}
          className="flex-1 p-2 text-sm rounded-lg border border-amber-200 dark:border-gray-600 bg-amber-50 dark:bg-gray-700 text-amber-900 dark:text-amber-200 placeholder:text-amber-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
          onKeyDown={e => { if (e.key === 'Enter' && inputText.trim()) handleSubmit(); }}
        />
        <button
          onClick={handleSubmit}
          disabled={!inputText.trim() || submitting}
          className="px-3 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {submitting ? '...' : 'Confess'}
        </button>
      </div>

      {/* Feed */}
      {loading && (
        <p className="text-xs text-amber-600 dark:text-amber-400 animate-pulse">Loading confessions...</p>
      )}

      {data && !loading && (
        <div className={`space-y-1.5 ${expanded ? '' : 'max-h-32 overflow-hidden'}`}>
          {data.confessions.length === 0 ? (
            <p className="text-xs text-amber-500 dark:text-amber-400 italic">No confessions yet. Be the first!</p>
          ) : (
            data.confessions.map((c, i) => (
              <div
                key={`${c.userId}-${c.timestamp}-${i}`}
                className="text-xs px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-gray-700 text-amber-800 dark:text-amber-300 italic"
              >
                "{c.text}"
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
