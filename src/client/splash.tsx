import './index.css';
import { requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-amber-50 p-6">
      <div className="text-6xl animate-float">🎮</div>
      <h1 className="text-3xl font-bold text-amber-900 text-center">
        Story Arcade
      </h1>
      <p className="text-amber-700 text-center text-sm max-w-xs">
        Daily emotional story-games. Mood checks, hot takes, bingo, and confessions.
      </p>
      <button
        className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-8 py-3 rounded-full transition-colors shadow-lg"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Play Today
      </button>
      <footer className="text-xs text-amber-400 absolute bottom-4">
        one post per day. come back tomorrow.
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
