import { useState, useEffect, useRef } from 'react';
import type { Archetype } from '../../shared/archetypes';
import { getEvolutionProgress } from '../../shared/archetypes';

type Props = {
  archetype: Archetype;
  streakDays: number;
  daysPlayed: number;
};

/**
 * Displays the user's current personality archetype with:
 *  - 8-bit sprite visualization
 *  - Name + emoji + tier badge
 *  - "Evolves in X days" progress tracker
 *  - CSS animation on tier-up
 */
export const ArchetypeCard = ({ archetype, streakDays, daysPlayed }: Props) => {
  const [tierUp, setTierUp] = useState(false);
  const prevTierRef = useRef(archetype.tier);

  // Detect tier-up for animation trigger
  useEffect(() => {
    if (archetype.tier > prevTierRef.current) {
      setTierUp(true);
      const timer = setTimeout(() => setTierUp(false), 2000);
      prevTierRef.current = archetype.tier;
      return () => clearTimeout(timer);
    }
    prevTierRef.current = archetype.tier;
  }, [archetype.tier]);

  const evolution = getEvolutionProgress(archetype, streakDays, daysPlayed);

  const tierColors: Record<number, string> = {
    1: 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300',
    2: 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300',
    3: 'bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300',
  };

  const tierLabels: Record<number, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
  };

  return (
    <div
      className={`
        bg-amber-50 dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-gray-700
        p-3 shadow-sm transition-all duration-500
        ${tierUp ? 'animate-tier-up ring-2 ring-purple-400 dark:ring-purple-500' : ''}
      `}
    >
      {/* Header: Sprite + Name */}
      <div className="flex items-start gap-3">
        {/* 8-bit Sprite */}
        <div className="flex-shrink-0">
          <pre
            className={`
              font-mono text-[7px] leading-[7px] tracking-[0px] select-none
              text-amber-900 dark:text-amber-200
              bg-amber-100/50 dark:bg-gray-900/50 rounded p-1
              border border-amber-300/50 dark:border-amber-600/30
              transition-transform duration-700
              ${tierUp ? 'animate-sprite-transform scale-110' : 'scale-100'}
            `}
            style={{ fontFamily: '"Courier New", monospace' }}
          >
            {archetype.sprite}
          </pre>
        </div>

        {/* Name + Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg leading-none">{archetype.emoji}</span>
            <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200 truncate">
              {archetype.name}
            </h3>
            <span
              className={`
                inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold
                ${tierColors[archetype.tier]}
                ${tierUp ? 'animate-pop-in' : ''}
              `}
            >
              T{tierLabels[archetype.tier]}
            </span>
          </div>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 leading-snug line-clamp-2">
            {archetype.description}
          </p>
        </div>
      </div>

      {/* Evolution Progress */}
      {evolution && (
        <div className="mt-2 pt-2 border-t border-amber-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-amber-500 dark:text-amber-400 font-medium">
              Evolves to <span className="font-bold">{evolution.nextTierName}</span>
            </span>
            <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400">
              {evolution.daysUntilEvolve > 0
                ? `${evolution.daysUntilEvolve}d left`
                : 'Ready!'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-amber-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-purple-500 transition-all duration-700 ease-out"
              style={{ width: `${evolution.progressPct}%` }}
            />
          </div>
          {evolution.daysUntilEvolve === 0 && (
            <p className="text-[9px] text-purple-600 dark:text-purple-400 mt-1 font-semibold animate-pulse">
              Evolution imminent! Keep your streak alive.
            </p>
          )}
        </div>
      )}

      {/* Already at max tier */}
      {!evolution && archetype.tier >= 3 && (
        <div className="mt-2 pt-2 border-t border-amber-200/50 dark:border-gray-700/50">
          <p className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold text-center">
            Max tier reached. You are legendary.
          </p>
        </div>
      )}
    </div>
  );
};
