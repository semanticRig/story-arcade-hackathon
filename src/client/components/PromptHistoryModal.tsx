import type { MySubmissionsResponse, MySubmission } from '../../shared/api';

type Props = {
  data: MySubmissionsResponse | null;
  loading: boolean;
  onClose: () => void;
};

const TYPE_LABELS: Record<string, string> = {
  choice: 'This or That',
  template: 'Bingo',
  confession: 'Confession',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  approved: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700',
  rejected: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
};

function payloadPreview(submission: MySubmission): string {
  if (typeof submission.payload?.text === 'string') {
    const t = submission.payload.text as string;
    return t.length > 80 ? t.slice(0, 80) + '...' : t;
  }
  return '(no preview)';
}

export const PromptHistoryModal = ({ data, loading, onClose }: Props) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm border border-amber-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto animate-card-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-amber-900 dark:text-amber-200">My Submissions</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-amber-50 dark:bg-gray-700 rounded-xl p-3 animate-pulse">
                <div className="h-3 bg-amber-200 dark:bg-gray-600 rounded w-3/4 mb-2" />
                <div className="h-3 bg-amber-200 dark:bg-gray-600 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : !data || data.submissions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-amber-700 dark:text-amber-300 font-medium">
              You haven't submitted any prompts yet.
            </p>
            <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">
              Be the first! Share a prompt for the community.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.submissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-amber-50 dark:bg-gray-700 rounded-xl p-3 border border-amber-100 dark:border-gray-600"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-amber-900 dark:text-amber-200 truncate">
                      {payloadPreview(sub)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-amber-500 dark:text-amber-400">
                        {TYPE_LABELS[sub.type] ?? sub.type}
                      </span>
                      <span className="text-[10px] text-amber-400/70 dark:text-amber-500/70">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {sub.status === 'rejected' && sub.rejectionReason && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 mt-1 italic">
                        Reason: {sub.rejectionReason}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_COLORS[sub.status] ?? 'bg-gray-100 text-gray-600 border-gray-300'}`}
                  >
                    {sub.status}
                  </span>
                </div>
              </div>
            ))}
            <p className="text-center text-[10px] text-amber-400/60 dark:text-amber-500/50 pt-1">
              Showing {data.submissions.length} of {data.total} submissions
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
