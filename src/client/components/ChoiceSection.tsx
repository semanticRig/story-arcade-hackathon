import { useState } from 'react';
import type { ChoiceQuestion, ChoiceSubmitResponse } from '../../shared/api';

type Props = {
  question: ChoiceQuestion;
  onSubmit: (questionId: string, optionId: string, customText?: string) => Promise<ChoiceSubmitResponse | null>;
};

export const ChoiceSection = ({ question, onSubmit }: Props) => {
  const [voted, setVoted] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aggregate, setAggregate] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customOptionId, setCustomOptionId] = useState<string | null>(null);

  const handleVote = async (optionId: string) => {
    if (voted || submitting) return;
    // If this is the "Write your own" option (last option, with custom text behavior)
    const opt = question.options.find(o => o.id === optionId);
    if (opt && opt.text === 'Write your own answer…' && !showCustomInput) {
      setShowCustomInput(true);
      setCustomOptionId(optionId);
      return;
    }
    await doSubmit(optionId, undefined);
  };

  const handleCustomSubmit = async () => {
    if (!customOptionId || !customText.trim() || submitting) return;
    await doSubmit(customOptionId, customText.trim());
  };

  const doSubmit = async (optionId: string, text?: string) => {
    setSubmitting(true);
    setError(null);
    const res = await onSubmit(question.id, optionId, text);
    if (res) {
      setVoted(optionId);
      setAggregate(res.aggregate);
    } else {
      setError('Failed to submit. Try again?');
    }
    setSubmitting(false);
  };

  const total = aggregate
    ? Object.values(aggregate).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-amber-100 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">
        This or That
      </h2>
      <p className="text-base font-medium mb-3 dark:text-amber-200">{question.question}</p>
      <div className="space-y-2">
        {question.options.map((opt) => {
          const pct = aggregate && total > 0 ? Math.round(((aggregate[opt.id] ?? 0) / total) * 100) : 0;
          const isSelected = voted === opt.id;
          const isCustom = !voted && showCustomInput && customOptionId === opt.id;
          return (
            <div key={opt.id}>
              <button
                onClick={() => handleVote(opt.id)}
                disabled={!!voted}
                className={`w-full text-left p-3 rounded-xl border transition-all relative overflow-hidden ${
                  isSelected
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900'
                    : isCustom
                    ? 'border-amber-400 ring-2 ring-amber-300'
                    : voted
                    ? 'border-gray-200 dark:border-gray-700 opacity-60'
                    : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 active:scale-[0.98]'
                }`}
              >
                <span className="relative z-10 text-sm font-medium dark:text-gray-300">{opt.text}</span>
                {submitting && !voted && !aggregate && <span className="relative z-10 text-xs text-amber-400 ml-2 animate-pulse">submitting...</span>}
                {aggregate && (
                  <div
                    className="absolute inset-0 bg-amber-100 dark:bg-amber-800 transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                )}
                {aggregate && (
                  <span className="relative z-10 text-xs text-amber-600 dark:text-amber-400 ml-2">{pct}%</span>
                )}
              </button>
              {isCustom && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    placeholder="Type your answer..."
                    maxLength={200}
                    autoFocus
                    className="flex-1 p-2.5 text-sm rounded-lg border border-amber-300 bg-amber-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    onKeyDown={e => { if (e.key === 'Enter' && customText.trim()) handleCustomSubmit(); }}
                  />
                  <button
                    onClick={handleCustomSubmit}
                    disabled={!customText.trim() || submitting}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? '...' : 'Submit'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && !voted && (
        <p className="text-xs text-red-500 text-center mt-2">{error}</p>
      )}
    </section>
  );
};
