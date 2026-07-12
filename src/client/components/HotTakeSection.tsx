import { useEffect, useRef, useState } from 'react';
import type { HotTakeStateResponse, HotTakeVoteCounts } from '../../shared/api';

type Props = {
  hotTakeState: HotTakeStateResponse | null;
  onVote: (vote: 'agree' | 'disagree' | 'unsure') => Promise<boolean>;
};

export const HotTakeSection = ({ hotTakeState, onVote }: Props) => {
  const [voteCounts, setVoteCounts] = useState<HotTakeVoteCounts>(
    hotTakeState?.voteCounts ?? { agree: 0, disagree: 0, unsure: 0 }
  );
  const [totalVotes, setTotalVotes] = useState(hotTakeState?.totalVotes ?? 0);
  const [userVote, setUserVote] = useState<string | null>(hotTakeState?.userVote ?? null);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync props → state when hotTakeState arrives after mount
  useEffect(() => {
    if (hotTakeState) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setVoteCounts(hotTakeState.voteCounts);
      setTotalVotes(hotTakeState.totalVotes);
      setUserVote(hotTakeState.userVote);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [hotTakeState]);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      if (userVote) { clearInterval(pollRef.current!); return; }
      try {
        const res = await fetch('/api/hot-take');
        if (res.ok) {
          const data: HotTakeStateResponse = await res.json();
          setVoteCounts(data.voteCounts);
          setTotalVotes(data.totalVotes);
          if (data.userVote) setUserVote(data.userVote);
        }
        // eslint-disable-next-line no-empty
      } catch {}
    }, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVote = async (vote: 'agree' | 'disagree' | 'unsure') => {
    if (voting || userVote) return;
    setVoting(true);
    setVoteError(false);
    const ok = await onVote(vote);
    if (ok) {
      setUserVote(vote);
    } else {
      setVoteError(true);
    }
    setVoting(false);
  };

  const maxCount = Math.max(voteCounts.agree, voteCounts.disagree, voteCounts.unsure, 1);
  const total = totalVotes || 1;

  const bars = [
    { key: 'agree' as const, label: 'Agree', btnStyle: 'bg-green-600 hover:bg-green-700', barColor: 'bg-green-500', count: voteCounts.agree },
    { key: 'disagree' as const, label: 'Disagree', btnStyle: 'bg-red-600 hover:bg-red-700', barColor: 'bg-red-500', count: voteCounts.disagree },
    { key: 'unsure' as const, label: 'Unsure', btnStyle: 'bg-gray-500 hover:bg-gray-600', barColor: 'bg-gray-400', count: voteCounts.unsure },
  ];

  return (
    <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm">
      <h3 className="font-bold text-amber-900 mb-1">Hot Take Arena</h3>
      <p className="text-sm text-amber-800 font-medium mb-3 leading-snug">
        {hotTakeState?.hotTake.statement ?? 'Loading...'}
      </p>
      <p className="text-xs text-amber-500 mb-3">{totalVotes} community votes</p>

      {userVote ? (
        <div className="space-y-2">
          {bars.map(bar => {
            const pct = Math.round((bar.count / total) * 100);
            const barWidth = Math.round((bar.count / maxCount) * 100);
            return (
              <div key={bar.key}>
                <div className="flex justify-between text-xs text-amber-700 mb-0.5">
                  <span className="font-medium">{bar.label}</span>
                  <span>{pct}% ({bar.count})</span>
                </div>
                <div className="h-4 bg-amber-50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${bar.barColor} ${
                      bar.key === userVote ? 'ring-2 ring-amber-500' : 'opacity-60'
                    }`}
                    style={{ width: `${Math.max(barWidth, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
          <p className="text-center text-xs text-amber-400 mt-2">You voted {userVote}</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            {bars.map(bar => (
              <button
                key={bar.key}
                onClick={() => handleVote(bar.key)}
                disabled={voting}
                className={`flex-1 py-2 rounded-xl text-sm font-medium text-white transition-all ${bar.btnStyle} disabled:opacity-50`}
              >
                {voting ? '...' : bar.label}
              </button>
            ))}
          </div>
          {voteError && (
            <p className="text-center text-sm text-red-500 mt-2">Failed to submit vote. Try again.</p>
          )}
        </>
      )}
    </div>
  );
};
