import { useState } from 'react';
import type { MoodOption, MoodSubmitResponse } from '../../shared/api';

type Props = {
  options: MoodOption[];
  onSubmit: (moodKey: string) => Promise<MoodSubmitResponse | null>;
};

export const MoodSection = ({ options, onSubmit }: Props) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aggregate, setAggregate] = useState<Record<string, number> | null>(null);

  const handleSelect = async (key: string) => {
    if (selected || submitting) return;
    setSubmitting(true);
    const res = await onSubmit(key);
    if (res) {
      setSelected(key);
      setAggregate(res.aggregate);
    }
    setSubmitting(false);
  };

  const total = aggregate
    ? Object.values(aggregate).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-amber-100 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3">
        How are we feeling?
      </h2>
      <div className="flex gap-3 justify-center flex-wrap">
        {options.map((opt) => {
          const pct = aggregate && total > 0 ? Math.round(((aggregate[opt.key] ?? 0) / total) * 100) : 0;
          return (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt.key)}
              disabled={!!selected}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                selected === opt.key
                  ? 'bg-amber-100 dark:bg-amber-900 ring-2 ring-amber-400 scale-110'
                  : selected
                  ? 'opacity-50'
                  : 'hover:bg-amber-50 dark:hover:bg-gray-700 active:scale-95'
              }`}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-xs font-medium">{opt.label}</span>
              {submitting && selected === null && !aggregate && <span className="text-xs text-amber-400 animate-pulse">submitting...</span>}
              {aggregate && <span className="text-xs text-amber-500 dark:text-amber-400">{pct}%</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
};
