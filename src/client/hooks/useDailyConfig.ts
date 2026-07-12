import { useCallback, useEffect, useState } from 'react';
import type {
  ArcadeResults,
  DailyConfig,
  MoodSubmitResponse,
  ChoiceSubmitResponse,
  TemplateSubmitResponse,
  ConfessionVoteResponse,
  CanvasStateResponse,
  CanvasPlaceRequest,
  CanvasPlaceResponse,
  HotTakeStateResponse,
  HotTakeVoteResponse,
  WeeklyRecapResponse,
  HallOfFameResponse,
  CommunityConfessionsResponse,
} from '../../shared/api';

interface DailyConfigState {
  config: DailyConfig | null;
  loading: boolean;
  error: string | null;
}

export const useDailyConfig = () => {
  const [state, setState] = useState<DailyConfigState>({
    config: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const abort = new AbortController();
    const init = async () => {
      try {
        const timeout = setTimeout(() => abort.abort(), 30000);
        const res = await fetch('/api/daily-config', { signal: abort.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: DailyConfig = await res.json();
        setState({ config: data, loading: false, error: null });
      } catch (e) {
        const msg = (e as Error)?.name === 'AbortError'
          ? 'Request timed out. Try refreshing or creating a new post.'
          : 'Failed to load daily config. Make sure you are on a Story Arcade post.';
        setState({ config: null, loading: false, error: msg });
      }
    };
    void init();
    return () => abort.abort();
  }, []);

  const submitMood = useCallback(async (moodKey: string): Promise<MoodSubmitResponse | null> => {
    try {
      const res = await fetch('/api/mood/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moodKey }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const submitChoice = useCallback(async (questionId: string, optionId: string, customText?: string): Promise<ChoiceSubmitResponse | null> => {
    try {
      const res = await fetch('/api/choice/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, optionId, customText }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const submitTemplate = useCallback(async (templateId: string, cellIds: string[]): Promise<TemplateSubmitResponse | null> => {
    try {
      const res = await fetch('/api/template/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, cellIds }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const submitConfessionVote = useCallback(async (confessionId: string, tag: string): Promise<ConfessionVoteResponse | null> => {
    try {
      const res = await fetch('/api/confession/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confessionId, tag }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const shareResults = useCallback(async (results: ArcadeResults): Promise<{status: string; commentId?: string} | null> => {
    try {
      const res = await fetch('/api/results/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const fetchCanvas = useCallback(async (): Promise<CanvasStateResponse | null> => {
    try {
      const res = await fetch('/api/canvas');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const placePixel = useCallback(async (req: CanvasPlaceRequest): Promise<CanvasPlaceResponse | null> => {
    try {
      const res = await fetch('/api/canvas/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const fetchHotTake = useCallback(async (): Promise<HotTakeStateResponse | null> => {
    try {
      const res = await fetch('/api/hot-take');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const submitHotTakeVote = useCallback(async (vote: 'agree' | 'disagree' | 'unsure'): Promise<HotTakeVoteResponse | null> => {
    try {
      const res = await fetch('/api/hot-take/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const fetchWeeklyRecap = useCallback(async (): Promise<WeeklyRecapResponse | null> => {
    try {
      const res = await fetch('/api/weekly/recap');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const shareWeeklyRecap = useCallback(async (recap: WeeklyRecapResponse): Promise<{status: string; commentId?: string} | null> => {
    try {
      const res = await fetch('/api/weekly/recap/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recap }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const fetchHallOfFame = useCallback(async (): Promise<HallOfFameResponse | null> => {
    try {
      const res = await fetch('/api/community/hall-of-fame');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const submitConfession = useCallback(async (text: string): Promise<{status: string} | null> => {
    try {
      const res = await fetch('/api/confessions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const fetchConfessionFeed = useCallback(async (): Promise<CommunityConfessionsResponse | null> => {
    try {
      const res = await fetch('/api/confessions/feed');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const seedDemo = useCallback(async (): Promise<{status: string; logs?: string[]} | null> => {
    try {
      const res = await fetch('/api/internal/seed-demo', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  return { ...state, submitMood, submitChoice, submitTemplate, submitConfessionVote, shareResults, fetchCanvas, placePixel, fetchHotTake, submitHotTakeVote, fetchWeeklyRecap, shareWeeklyRecap, fetchHallOfFame, submitConfession, fetchConfessionFeed, seedDemo };
};
