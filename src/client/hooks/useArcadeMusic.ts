import { useCallback, useEffect, useRef, useState } from 'react';
import { createSoundEngine } from '8bit-sound-engine';
import type { BGMDefinition } from '8bit-sound-engine';

// ---------------------------------------------------------------------------
// Arcade BGM — cheerful C major chiptune, 4-bar loop
// Composed for the Story Arcade daily game.
// Channels: square (lead) + triangle (bass) + square (chords)
// ---------------------------------------------------------------------------

const BPM = 135;

const ARCADE_BGM: BGMDefinition = {
  bpm: BPM,
  loop: true,
  channels: [
    // --- Channel 0: Lead melody (square wave) ---
    {
      wave: 'square',
      label: 'lead',
      duty: 0.5,
      volume: 0.25,
      pan: -0.15,
      notes: [
        // Bar 1 — C major arpeggio up
        { pitch: 'C4', duration: '8n' },
        { pitch: 'E4', duration: '8n' },
        { pitch: 'G4', duration: '8n' },
        { pitch: 'C5', duration: '8n' },
        // Bar 1 cont. — arpeggio down
        { pitch: 'G4', duration: '8n' },
        { pitch: 'E4', duration: '8n' },
        { pitch: 'C4', duration: '8n' },
        { pitch: 'E4', duration: '8n' },

        // Bar 2 — F major arpeggio up
        { pitch: 'F4', duration: '8n' },
        { pitch: 'A4', duration: '8n' },
        { pitch: 'C5', duration: '8n' },
        { pitch: 'F5', duration: '8n' },
        // Bar 2 cont. — arpeggio down
        { pitch: 'C5', duration: '8n' },
        { pitch: 'A4', duration: '8n' },
        { pitch: 'F4', duration: '8n' },
        { pitch: 'A4', duration: '8n' },

        // Bar 3 — G major arpeggio up
        { pitch: 'G4', duration: '8n' },
        { pitch: 'B4', duration: '8n' },
        { pitch: 'D5', duration: '8n' },
        { pitch: 'G5', duration: '8n' },
        // Bar 3 cont. — arpeggio down
        { pitch: 'D5', duration: '8n' },
        { pitch: 'B4', duration: '8n' },
        { pitch: 'G4', duration: '8n' },
        { pitch: 'B4', duration: '8n' },

        // Bar 4 — walk down to resolve on C
        { pitch: 'C5', duration: '8n' },
        { pitch: 'G4', duration: '8n' },
        { pitch: 'E4', duration: '8n' },
        { pitch: 'C4', duration: '8n' },
        { pitch: 'E4', duration: '8n' },
        { pitch: 'G4', duration: '8n' },
        { pitch: 'C5', duration: '8n' },
        { pitch: 'C4', duration: '8n' },
      ],
    },

    // --- Channel 1: Harmony / chord stabs (square wave) ---
    {
      wave: 'square',
      label: 'chords',
      duty: 0.25,
      volume: 0.12,
      pan: 0.15,
      notes: [
        // Bar 1 — C major dyads
        { pitch: 'E4', duration: '4n' },
        { pitch: 'G4', duration: '4n' },
        { pitch: 'C5', duration: '4n' },
        { pitch: 'G4', duration: '4n' },

        // Bar 2 — F major dyads
        { pitch: 'F4', duration: '4n' },
        { pitch: 'A4', duration: '4n' },
        { pitch: 'C5', duration: '4n' },
        { pitch: 'A4', duration: '4n' },

        // Bar 3 — G major dyads
        { pitch: 'G4', duration: '4n' },
        { pitch: 'B4', duration: '4n' },
        { pitch: 'D5', duration: '4n' },
        { pitch: 'B4', duration: '4n' },

        // Bar 4 — C major cadence
        { pitch: 'E4', duration: '4n' },
        { pitch: 'G4', duration: '4n' },
        { pitch: 'C5', duration: '2n' },
      ],
    },

    // --- Channel 2: Bass (triangle wave) ---
    {
      wave: 'triangle',
      label: 'bass',
      volume: 0.3,
      pan: 0,
      notes: [
        // Bar 1 — C root/fifth
        { pitch: 'C3', duration: '2n' },
        { pitch: 'G2', duration: '2n' },

        // Bar 2 — F root/fifth
        { pitch: 'F2', duration: '2n' },
        { pitch: 'C3', duration: '2n' },

        // Bar 3 — G root/fifth
        { pitch: 'G2', duration: '2n' },
        { pitch: 'D3', duration: '2n' },

        // Bar 4 — C root/fifth
        { pitch: 'C3', duration: '2n' },
        { pitch: 'G2', duration: '2n' },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

type ArcadeMusicState = {
  /** Whether the music is currently playing. */
  isPlaying: boolean;
  /** Toggle play/pause. Call on user gesture (browser autoplay policy). */
  toggle: () => void;
  /** Explicitly start playing. */
  start: () => void;
  /** Explicitly stop playing. */
  stop: () => void;
};

export const useArcadeMusic = (): ArcadeMusicState => {
  const engineRef = useRef<ReturnType<typeof createSoundEngine> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const hasStarted = useRef(false);

  // Lazy-initialise the engine once
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = createSoundEngine({
        reverb: { duration: 1.2, decay: 2.0, mix: 0.15 },
      });
    }
    return () => {
      engineRef.current?.bgm.stop();
      engineRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || hasStarted.current) return;

    // Resume AudioContext (required after user gesture)
    engine.resume();
    engine.bgm.play(ARCADE_BGM);
    hasStarted.current = true;
    setIsPlaying(true);
  }, []);

  const stop = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !hasStarted.current) return;

    engine.bgm.stop({ fade: 300 });
    hasStarted.current = false;
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  return { isPlaying, toggle, start, stop };
};
