import { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import type { Template, TemplateSubmitResponse } from '../../shared/api';

type Props = {
  template: Template;
  onSubmit: (templateId: string, cellIds: string[]) => Promise<TemplateSubmitResponse | null>;
};

export const TemplateSection = ({ template, onSubmit }: Props) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TemplateSubmitResponse | null>(null);

  const hasBingo = useMemo(() => {
    if (template.type !== 'bingo') return false;
    const grid = template.cells;
    const rows = grid.length;
    if (rows === 0) return false;
    const cols = grid[0]!.length;
    if (cols === 0) return false;
    for (let r = 0; r < rows; r++) {
      if (grid[r]!.every(cell => selected.has(cell.id))) return true;
    }
    for (let c = 0; c < cols; c++) {
      if (grid.every(row => selected.has(row[c]!.id))) return true;
    }
    let diag1 = true;
    let diag2 = true;
    for (let i = 0; i < rows && i < cols; i++) {
      if (!selected.has(grid[i]![i]!.id)) diag1 = false;
      if (!selected.has(grid[i]![cols - 1 - i]!.id)) diag2 = false;
    }
    return diag1 || diag2;
  }, [selected, template.cells, template.type]);

  const toggleCell = (cellId: string) => {
    if (submitted) return;
    const next = new Set(selected);
    if (next.has(cellId)) next.delete(cellId);
    else next.add(cellId);
    setSelected(next);
  };

  const handleSubmit = async () => {
    if (submitted || selected.size === 0 || submitting) return;
    setSubmitting(true);
    const res = await onSubmit(template.id, Array.from(selected));
    if (res) {
      setSubmitted(true);
      setResult(res);
    }
    setSubmitting(false);
  };

  const bingoCelebration = template.type === 'bingo' && submitted && hasBingo;

  useEffect(() => {
    if (bingoCelebration) {
      const timer = setTimeout(() => {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [bingoCelebration]);

  return (
    <section className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-amber-100 dark:border-gray-700 ${bingoCelebration ? 'animate-bingo' : ''}`}>
      <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">
        {template.title}
      </h2>
      <p className="text-xs text-amber-500 dark:text-amber-400 mb-3">
        {template.type === 'bingo' ? 'Tap cells that apply to you' : 'Put a finger down'}
      </p>
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        {template.cells.flatMap(row => row).map((cell) => (
          <button
            key={cell.id}
            onClick={() => toggleCell(cell.id)}
            disabled={submitted}
            className={`text-xs p-2 rounded-lg border text-center transition-all font-medium ${
              selected.has(cell.id)
                ? 'bg-amber-200 dark:bg-amber-900 border-amber-400 scale-105'
                : submitted
                ? 'opacity-50'
                : 'bg-amber-50 dark:bg-gray-700 border-amber-100 dark:border-gray-600 hover:bg-amber-100 dark:hover:bg-gray-600 active:scale-95'
            } ${cell.id.endsWith('b5') || cell.text.includes('Free space') ? 'italic text-amber-500' : ''}`}
          >
            {cell.text}
          </button>
        ))}
      </div>
      {!submitted && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-amber-600 dark:text-amber-400">{selected.size} selected</span>
          <button
            onClick={handleSubmit}
            disabled={submitting || selected.size === 0}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              submitting
                ? 'text-amber-500 bg-amber-100'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            } disabled:opacity-50`}
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      )}
      {submitted && result !== null && (
        <div className="text-center mt-3">
          <p className="text-lg font-bold text-amber-900 dark:text-amber-200">{result.score} point{result.score !== 1 ? 's' : ''}</p>
          {bingoCelebration && <p className="text-sm text-amber-600 dark:text-amber-400">BINGO!</p>}
          {hasBingo && !bingoCelebration && <p className="text-sm text-amber-600 dark:text-amber-400">BINGO!</p>}
        </div>
      )}
    </section>
  );
};
