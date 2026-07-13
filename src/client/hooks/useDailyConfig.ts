import { useCallback, useEffect, useRef, useState } from 'react';
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
  MySubmissionsResponse,
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

  /** Last server error message — ref (synchronous) so callers can read it immediately after failed call */
  const lastSubmitError = useRef<string | null>(null);

  /** Extract the server's error message from a non-ok response body */
  const parseErrorBody = async (res: Response): Promise<string> => {
    try {
      const body = await res.json();
      return (body as { message?: string })?.message ?? `HTTP ${res.status}`;
    } catch {
      return `HTTP ${res.status}`;
    }
  };

  /** Shared fetch helper that surfaces server error messages */
  const apiPost = async <T>(url: string, body: unknown): Promise<T | null> => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await parseErrorBody(res);
        lastSubmitError.current = msg;
        return null;
      }
      lastSubmitError.current = null;
      return await res.json();
    } catch {
      lastSubmitError.current = 'Network error. Check your connection.';
      return null;
    }
  };

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
    return apiPost<MoodSubmitResponse>('/api/mood/submit', { moodKey });
  }, []);

  const submitChoice = useCallback(async (questionId: string, optionId: string, customText?: string): Promise<ChoiceSubmitResponse | null> => {
    return apiPost<ChoiceSubmitResponse>('/api/choice/submit', { questionId, optionId, customText });
  }, []);

  const submitTemplate = useCallback(async (templateId: string, cellIds: string[]): Promise<TemplateSubmitResponse | null> => {
    return apiPost<TemplateSubmitResponse>('/api/template/submit', { templateId, cellIds });
  }, []);

  const submitConfessionVote = useCallback(async (confessionId: string, tag: string): Promise<ConfessionVoteResponse | null> => {
    return apiPost<ConfessionVoteResponse>('/api/confession/vote', { confessionId, tag });
  }, []);

  const shareResults = useCallback(async (results: ArcadeResults): Promise<{status: string; commentId?: string} | null> => {
    return apiPost<{status: string; commentId?: string}>('/api/results/comment', { results });
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
    return apiPost<CanvasPlaceResponse>('/api/canvas/place', req);
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
    return apiPost<HotTakeVoteResponse>('/api/hot-take/vote', { vote });
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
    return apiPost<{status: string}>('/api/confessions/submit', { text });
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

  const fetchMySubmissions = useCallback(async (): Promise<MySubmissionsResponse | null> => {
    try {
      const res = await fetch('/api/prompts/my-submissions');
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

  return { ...state, lastSubmitError, submitMood, submitChoice, submitTemplate, submitConfessionVote, shareResults, fetchCanvas, placePixel, fetchHotTake, submitHotTakeVote, fetchWeeklyRecap, shareWeeklyRecap, fetchHallOfFame, submitConfession, fetchConfessionFeed, fetchMySubmissions, seedDemo };
};
