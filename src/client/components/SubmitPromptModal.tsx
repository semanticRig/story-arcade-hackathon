import { useState } from 'react';

type Props = {
  onClose: () => void;
};

export const SubmitPromptModal = ({ onClose }: Props) => {
  const [type, setType] = useState<'choice' | 'template' | 'confession'>('choice');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/prompts/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload: { text: content.trim() } }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        setError('Server rejected the submission. Try again?');
      }
    } catch {
      setError('Network error. Check your connection.');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm border border-amber-100 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="text-center space-y-3">
            <p className="text-lg font-medium text-amber-700 dark:text-amber-300">Submitted!</p>
            <p className="text-xs text-amber-500 dark:text-amber-400">A moderator will review it.</p>
            <button
              onClick={onClose}
              className="bg-amber-600 text-white px-4 py-2 rounded-full text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-bold mb-3 dark:text-amber-200">Submit a Prompt</h3>
            <div className="flex gap-2 mb-3">
              {(['choice', 'template', 'confession'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    type === t
                      ? 'bg-amber-100 dark:bg-amber-900 border-amber-400 text-amber-800 dark:text-amber-200'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {t === 'choice' ? 'This or That' : t === 'template' ? 'Bingo' : 'Confession'}
                </button>
              ))}
            </div>
            <textarea
              className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-gray-400 dark:placeholder:text-gray-500"
              rows={4}
              placeholder={
                type === 'choice'
                  ? 'e.g. "Would you rather... (Option A) or (Option B)?"'
                  : type === 'template'
                  ? 'Suggest a bingo theme...'
                  : 'Share an anonymous confession...'
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex gap-2 mt-3">
              {error && <p className="text-xs text-red-500 text-center mb-2 w-full">{error}</p>}
              <button
                onClick={onClose}
                className="flex-1 text-sm text-gray-500 dark:text-gray-400 py-2 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white text-sm py-2 rounded-xl transition-colors"
              >
                {submitting ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
