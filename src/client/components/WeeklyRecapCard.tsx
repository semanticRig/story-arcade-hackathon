import { useState } from 'react';
import type { WeeklyRecapResponse } from '../../shared/api';
import { PERSONALITY_DESCRIPTIONS } from '../../shared/constants';
import { getArchetypeById } from '../../shared/archetypes';

type Props = {
  recap: WeeklyRecapResponse | null;
  loading: boolean;
  onClose: () => void;
  onShare?: (recap: WeeklyRecapResponse) => void;
};

export const WeeklyRecapCard = ({ recap, loading, onClose, onShare }: Props) => {
  const [sharing, setSharing] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 w-full max-w-sm border-2 border-amber-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto animate-card-pop-in" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="text-center py-8">
            <p className="text-amber-600 dark:text-amber-400 animate-pulse">Loading your weekly recap...</p>
          </div>
        ) : !recap ? (
          <div className="text-center py-8 space-y-3">
            <p className="text-red-500 text-sm">Failed to load recap. Try again later.</p>
            <button onClick={onClose} className="text-amber-600 text-xs underline">Close</button>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <div className="text-4xl mb-1">📊</div>
              <h2 className="text-xl font-bold text-amber-900 dark:text-amber-200">This Week in Story Arcade</h2>
              <p className="text-xs text-amber-500 dark:text-amber-400">ending {recap.weekEnding}</p>
            </div>

            {/* Archetype Identity */}
            {(() => {
              const archetype = recap.archetypeId ? getArchetypeById(recap.archetypeId) : undefined;
              const desc = PERSONALITY_DESCRIPTIONS[recap.personalityLabel] ?? 'You are one of a kind.';
              return (
                <div className="text-center mb-4">
                  {archetype ? (
                    <>
                      {/* 8-bit sprite */}
                      <pre className="font-mono text-[7px] leading-[7px] tracking-[0px] inline-block select-none text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-gray-900 rounded p-1 mb-2 border border-amber-300 dark:border-amber-700"
                           style={{ fontFamily: '"Courier New", monospace' }}>
                        {archetype.sprite}
                      </pre>
                      <p className="text-xl font-bold text-amber-900 dark:text-amber-200 mt-1">
                        {archetype.emoji} {archetype.name}
                      </p>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 mt-1">
                        Tier {archetype.tier}
                      </span>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-amber-900 dark:text-amber-200">{recap.personalityLabel}</p>
                    </>
                  )}
                  <p className="text-xs text-amber-600 dark:text-amber-400 italic mt-2">
                    {archetype ? archetype.description : desc}
                  </p>
                </div>
              );
            })()}

            <div className="space-y-2 mb-4">
              <div className="flex justify-between bg-amber-50 dark:bg-gray-700 rounded-xl px-3 py-2">
                <span className="text-xs text-amber-700 dark:text-amber-400">Days played</span>
                <span className="text-sm font-bold text-amber-900 dark:text-amber-200">{recap.totalDaysPlayed}/7</span>
              </div>

              {recap.dominantMood && (
                <div className="flex justify-between bg-amber-50 dark:bg-gray-700 rounded-xl px-3 py-2">
                  <span className="text-xs text-amber-700 dark:text-amber-400">Dominant mood</span>
                  <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    {recap.dominantMood.emoji} {recap.dominantMood.label} ({recap.dominantMood.pct}%)
                  </span>
                </div>
              )}

              {recap.topChoice && (
                <div className="flex justify-between bg-amber-50 dark:bg-gray-700 rounded-xl px-3 py-2">
                  <span className="text-xs text-amber-700 dark:text-amber-400">Top choice</span>
                  <span className="text-sm font-bold text-amber-900 dark:text-amber-200">{recap.topChoice.chosenSide}</span>
                </div>
              )}

              <div className="flex justify-between bg-amber-50 dark:bg-gray-700 rounded-xl px-3 py-2">
                <span className="text-xs text-amber-700 dark:text-amber-400">Avg bingo score</span>
                <span className="text-sm font-bold text-amber-900 dark:text-amber-200">{recap.avgBingoScore}</span>
              </div>

              <div className="flex justify-between bg-amber-50 dark:bg-gray-700 rounded-xl px-3 py-2">
                <span className="text-xs text-amber-700 dark:text-amber-400">Streak</span>
                <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {'🔥'.repeat(Math.min(recap.streakDays, 5))} {recap.streakDays} day{recap.streakDays !== 1 ? 's' : ''}
                </span>
              </div>

              {recap.badges.length > 0 && (
                <div className="flex justify-center gap-2 bg-amber-50 dark:bg-gray-700 rounded-xl px-3 py-2">
                  <span className="text-xs text-amber-700 dark:text-amber-400 self-center">Badges</span>
                  <span className="text-lg">
                    {recap.badges.includes('30-day') && <span title="30-day">🏆</span>}
                    {recap.badges.includes('7-day') && <span title="7-day">⭐</span>}
                    {recap.badges.includes('3-day') && <span title="3-day">✨</span>}
                  </span>
                </div>
              )}
            </div>

            {onShare && recap && (
              <button
                onClick={async () => {
                  if (sharing) return;
                  setSharing(true);
                  onShare(recap);
                  setSharing(false);
                }}
                disabled={sharing}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white text-sm font-extrabold py-2 rounded-xl shadow transition-colors mb-2"
              >
                {sharing ? 'Sharing...' : 'Share to Comments'}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full text-sm text-gray-500 dark:text-gray-400 py-2 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};
