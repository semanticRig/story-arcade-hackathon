import { type FC } from 'react';

type MusicToggleProps = {
  isPlaying: boolean;
  onToggle: () => void;
};

/**
 * Small retro-styled toggle button for arcade BGM.
 * Shows a music-note icon that animates when playing.
 */
export const MusicToggle: FC<MusicToggleProps> = ({ isPlaying, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={isPlaying ? 'Mute music' : 'Play music'}
    className={`
      flex items-center justify-center
      w-8 h-8 rounded-full
      border border-amber-400 dark:border-amber-600
      text-sm select-none
      transition-all duration-200
      cursor-pointer
      ${isPlaying
        ? 'bg-amber-500 text-white shadow-[0_0_8px_rgba(245,158,11,0.6)]'
        : 'bg-amber-100 dark:bg-gray-800 text-amber-500 dark:text-amber-400 opacity-60 hover:opacity-100'
      }
    `}
  >
    <span className={isPlaying ? 'animate-pulse' : ''}>
      {isPlaying ? '♫' : '♪'}
    </span>
  </button>
);
