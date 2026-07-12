import { useState } from 'react';
import type { ArcadeResults } from '../../shared/api';
import { MascotAvatar, KarmaBar, RetroBadge, PixelDivider, WigglingBug, RainbowBird } from './RetroIcons';

type Props = {
  results: ArcadeResults;
  onShare: () => void;
  onClose: () => void;
};

const badgeEmoji: Record<string, string> = {
  '30-day': '🏆',
  '7-day': '⭐',
  '3-day': '✨',
};

export const ResultsCard = ({ results, onShare, onClose }: Props) => {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    await onShare();
    setSharing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="animate-bounce-in bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-sm border-2 border-amber-400 shadow-inner max-h-[90vh] overflow-y-auto">
        {/* ── Header ── */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <RainbowBird className="text-amber-400" size={28} />
            <h2 className="text-xl font-extrabold text-amber-900 dark:text-amber-200">
              Today's Arcade
            </h2>
          </div>
          <p className="text-xs text-amber-500 dark:text-amber-400 font-mono">your daily story</p>

          {results.mood && (
            <div className="flex justify-center mt-2">
              <MascotAvatar className="text-amber-500" size={48} />
            </div>
          )}
        </div>

        <PixelDivider className="text-amber-400/60 mx-auto my-3" />

        {/* ── Choices ── */}
        <div className="space-y-2">
          {results.choices.map((c) => (
            <div
              key={c.questionId}
              className="bg-amber-50 dark:bg-gray-800 rounded-xl p-3 border border-amber-200 dark:border-gray-700"
            >
              <p className="text-xs text-amber-700 dark:text-amber-400 font-extrabold mb-1">
                {c.question}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold dark:text-amber-200">{c.optionText}</span>
                <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                  {c.pct}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Bingo Score (KarmaBar) ── */}
        {results.template && (
          <>
            <PixelDivider className="text-amber-400/60 mx-auto my-3" />
            <div className="bg-amber-50 dark:bg-gray-800 rounded-xl p-3 border border-amber-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-extrabold">
                  Bingo Score
                </span>
                <span className="font-mono text-sm font-bold text-amber-900 dark:text-amber-200">
                  {results.template.score}/9
                </span>
              </div>
              <KarmaBar
                value={results.template.score}
                max={9}
                filledColor="#f59e0b"
                emptyColor="#d1d5db"
                className="mx-auto"
              />
            </div>
          </>
        )}

        {/* ── Confession Pulse (RetroBadge) ── */}
        {results.confession && (
          <>
            <PixelDivider className="text-amber-400/60 mx-auto my-3" />
            <div className="bg-amber-50 dark:bg-gray-800 rounded-xl p-3 border border-amber-200 dark:border-gray-700">
              <span className="text-xs text-amber-700 dark:text-amber-400 font-extrabold block mb-2">
                Confession Pulse
              </span>
              {results.confession.text && (
                <p className="text-xs italic text-amber-600 dark:text-amber-400 mb-2 leading-snug">
                  "{results.confession.text}"
                </p>
              )}
              <div className="flex items-center gap-2">
                <RetroBadge
                  text={results.confession.majorityTag ?? 'Mixed'}
                  color="#f59e0b"
                />
                <span className="font-mono text-xs text-amber-500 dark:text-amber-400">
                  {results.confession.totalVotes} votes
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── Streak ── */}
        <PixelDivider className="text-amber-400/60 mx-auto my-3" />
        <div className="flex justify-between items-center bg-amber-50 dark:bg-gray-800 rounded-xl px-3 py-2 border border-amber-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <WigglingBug className="text-amber-500" size={20} />
            <span className="text-xs text-amber-700 dark:text-amber-400 font-extrabold">Streak</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-sm font-bold text-amber-900 dark:text-amber-200">
              {results.streakDays}
            </span>
            {results.streakDays > 0 && (
              <span className="text-sm">{'🔥'.repeat(Math.min(results.streakDays, 5))}</span>
            )}
          </div>
        </div>

        {/* ── Badges ── */}
        {results.badges.length > 0 && (
          <>
            <PixelDivider className="text-amber-400/60 mx-auto my-3" />
            <div className="flex justify-center gap-2">
              {results.badges.map((b) => (
                <span key={b} className="text-lg" title={b}>
                  {badgeEmoji[b] ?? '🎖️'}
                </span>
              ))}
            </div>
          </>
        )}

        {/* ── Action buttons ── */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 text-sm text-gray-500 dark:text-gray-400 py-2 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-mono"
          >
            Close
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-extrabold py-2 rounded-xl shadow transition-colors"
          >
            {sharing ? 'Sharing...' : 'Share to Comments'}
          </button>
        </div>
      </div>
    </div>
  );
};
