import { useCallback, useEffect, useRef, useState } from 'react';
import { useDailyConfig } from '../hooks/useDailyConfig';
import { StreakBar } from './StreakBar';
import { MoodSection } from './MoodSection';
import { ChoiceSection } from './ChoiceSection';
import { TemplateSection } from './TemplateSection';
import { ConfessionSection } from './ConfessionSection';
import { SubmitPromptModal } from './SubmitPromptModal';
import { Toast } from './Toast';
import { ResultsCard } from './ResultsCard';
import { DailyCanvasSection } from './DailyCanvasSection';
import { HotTakeSection } from './HotTakeSection';
import { WeeklyRecapCard } from './WeeklyRecapCard';
import { MusicToggle } from './MusicToggle';
import { useArcadeMusic } from '../hooks/useArcadeMusic';
import { HallOfFameSection } from './HallOfFameSection';
import { LiveConfessionsFeed } from './LiveConfessionsFeed';
import type { ArcadeResults, CanvasStateResponse, CommunityConfessionsResponse, HallOfFameResponse, HotTakeStateResponse, WeeklyRecapResponse } from '../../shared/api';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const DailyArcadeScreen = () => {
  const { config, loading, error, submitMood, submitChoice, submitTemplate, submitConfessionVote, shareResults, fetchCanvas, placePixel, fetchHotTake, submitHotTakeVote, fetchWeeklyRecap, shareWeeklyRecap, fetchHallOfFame, submitConfession, fetchConfessionFeed, seedDemo } = useDailyConfig();
  const music = useArcadeMusic();
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [canvasState, setCanvasState] = useState<CanvasStateResponse | null>(null);
  const [hotTakeState, setHotTakeState] = useState<HotTakeStateResponse | null>(null);
  const [hallOfFameState, setHallOfFameState] = useState<HallOfFameResponse | null>(null);
  const [hallOfFameLoading, setHallOfFameLoading] = useState(false);
  const [confessionFeed, setConfessionFeed] = useState<CommunityConfessionsResponse | null>(null);
  const [confessionFeedLoading, setConfessionFeedLoading] = useState(false);
  const [confessionSubmitting, setConfessionSubmitting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [recapData, setRecapData] = useState<WeeklyRecapResponse | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [moodResult, setMoodResult] = useState<ArcadeResults['mood']>(null);
  const [choiceResults, setChoiceResults] = useState<ArcadeResults['choices']>([]);
  const [templateResult, setTemplateResult] = useState<ArcadeResults['template']>(null);
  const [confessionResult, setConfessionResult] = useState<ArcadeResults['confession']>(null);
  const [communityError, setCommunityError] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastType(type);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3500);
  };

  const handleMoodSubmit = useCallback(async (moodKey: string) => {
    const opt = config?.mood.options.find(o => o.key === moodKey);
    if (!opt) return null;
    const res = await submitMood(moodKey);
    if (res) {
      setMoodResult({ key: moodKey, emoji: opt.emoji, label: opt.label });
    } else {
      showToast('Failed to submit mood', 'error');
    }
    return res;
  }, [config, submitMood]);

  const handleChoiceSubmit = useCallback(async (questionId: string, optionId: string, customText?: string) => {
    const q = config?.questions.find(q => q.id === questionId);
    const opt = q?.options.find(o => o.id === optionId);
    const res = await submitChoice(questionId, optionId, customText);
    if (res && q && opt) {
      const total = Object.values(res.aggregate).reduce((a, b) => a + b, 0);
      const pct = total > 0 ? Math.round(((res.aggregate[optionId] ?? 0) / total) * 100) : 0;
      setChoiceResults(prev => [...prev, { questionId, question: q.question, chosenOption: optionId, optionText: customText ?? opt.text, pct }]);
    } else {
      showToast('Failed to submit choice', 'error');
    }
    return res;
  }, [config, submitChoice]);

  const handleTemplateSubmit = useCallback(async (templateId: string, cellIds: string[]) => {
    const res = await submitTemplate(templateId, cellIds);
    if (res) {
      setTemplateResult({ score: res.score, cells: cellIds });
    } else {
      showToast('Failed to submit bingo', 'error');
    }
    return res;
  }, [submitTemplate]);

  const handleConfessionSubmit = useCallback(async (confessionId: string, tag: string) => {
    const res = await submitConfessionVote(confessionId, tag);
    if (res) {
      setConfessionResult({ tag, majorityTag: res.majorityTag, totalVotes: res.totalVotes, ...(config?.confession.text ? { text: config.confession.text } : {}) });
    } else {
      showToast('Failed to submit confession tag', 'error');
    }
    return res;
  }, [submitConfessionVote, config?.confession.text]);

  const anyDone = !!(moodResult !== null || choiceResults.length > 0 || templateResult !== null || confessionResult !== null);
  const showWelcome = !anyDone;
  const sectionCount = (config ? 1 : 0) + (config?.questions.length ?? 0) + 1 + 1; // mood + questions + template + confession
  const doneCount = (moodResult ? 1 : 0) + choiceResults.length + (templateResult ? 1 : 0) + (confessionResult ? 1 : 0);
  const progressPct = sectionCount > 0 ? Math.round((doneCount / sectionCount) * 100) : 0;
  const allCompleted = !!(
    config
    && moodResult !== null
    && choiceResults.length === config.questions.length
    && templateResult !== null
    && confessionResult !== null
  );

  useEffect(() => {
    if (anyDone && !canvasState && !hotTakeState && !communityError) {
      const loadCommunity = async () => {
        try {
          const [c, h] = await Promise.all([fetchCanvas(), fetchHotTake()]);
          if (c) setCanvasState(c);
          if (h) setHotTakeState(h);
          if (!c && !h) setCommunityError(true);
        } catch {
          setCommunityError(true);
        }
      };
      void loadCommunity();
    }
  }, [anyDone, canvasState, hotTakeState, communityError, fetchCanvas, fetchHotTake]);

  const hallOfFameFetched = useRef(false);
  const confessionFeedFetched = useRef(false);

  useEffect(() => {
    if (anyDone && !hallOfFameFetched.current) {
      hallOfFameFetched.current = true;
      setHallOfFameLoading(true);
      const loadHallOfFame = async () => {
        const data = await fetchHallOfFame();
        if (data) setHallOfFameState(data);
        setHallOfFameLoading(false);
      };
      void loadHallOfFame();
    }
  }, [anyDone, fetchHallOfFame]);

  useEffect(() => {
    if (anyDone && !confessionFeedFetched.current) {
      confessionFeedFetched.current = true;
      setConfessionFeedLoading(true);
      const loadFeed = async () => {
        const data = await fetchConfessionFeed();
        if (data) setConfessionFeed(data);
        setConfessionFeedLoading(false);
      };
      void loadFeed();
    }
  }, [anyDone, fetchConfessionFeed]);

  // Streak milestone toast
  const prevBadges = useRef<string[]>([]);
  useEffect(() => {
    if (config?.userStats.badges) {
      const newBadges = config.userStats.badges.filter(b => !prevBadges.current.includes(b));
      if (newBadges.length > 0) {
        const badgeNames: Record<string, string> = { '3-day': '3-Day Streak', '7-day': '7-Day Streak', '30-day': '30-Day Streak' };
        const names = newBadges.map(b => badgeNames[b] ?? b).join(', ');
        showToast(`Badge unlocked: ${names}`, 'success');
      }
      prevBadges.current = config.userStats.badges;
    }
  }, [config?.userStats.badges]);

  const handleSeedDemo = async () => {
    setSeeding(true);
    const res = await seedDemo();
    if (res) {
      showToast('Demo data seeded! Reloading...', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showToast('Seed failed. Try again.', 'error');
      setSeeding(false);
    }
  };

  const handleCommunityConfession = async (text: string) => {
    setConfessionSubmitting(true);
    const res = await submitConfession(text);
    if (res) {
      // Refresh feed immediately
      const data = await fetchConfessionFeed();
      if (data) setConfessionFeed(data);
      showToast('Confession dropped!', 'success');
    } else {
      showToast('Failed to submit confession', 'error');
    }
    setConfessionSubmitting(false);
  };

  const retryCommunity = () => {
    setCommunityError(false);
    setCanvasState(null);
    setHotTakeState(null);
  };

  const handlePlacePixel = useCallback(async (x: number, y: number, color: string): Promise<boolean> => {
    const res = await placePixel({ x, y, color });
    if (res) {
      setCanvasState(prev => prev ? { ...prev, userPixel: { x, y, color }, totalPlaced: res.pixelCount } : prev);
      return true;
    }
    showToast('Failed to place pixel', 'error');
    return false;
  }, [placePixel]);

  const handleHotTakeVote = useCallback(async (vote: 'agree' | 'disagree' | 'unsure'): Promise<boolean> => {
    const res = await submitHotTakeVote(vote);
    if (res) {
      setHotTakeState(prev => prev ? { ...prev, userVote: vote, voteCounts: res.voteCounts, totalVotes: res.totalVotes } : prev);
      return true;
    }
    showToast('Failed to submit vote', 'error');
    return false;
  }, [submitHotTakeVote]);

  const handleShare = async () => {
    if (!config || !allCompleted) return;
    const results: ArcadeResults = {
      mood: moodResult,
      choices: choiceResults,
      template: templateResult,
      confession: confessionResult,
      streakDays: config.userStats.streakDays,
      badges: config.userStats.badges,
      pixelPlaced: canvasState?.userPixel ? { x: canvasState.userPixel.x, y: canvasState.userPixel.y, color: canvasState.userPixel.color } : null,
      hotTakeVote: hotTakeState?.userVote ?? null,
    };
    const res = await shareResults(results);
    if (res) {
      showToast('Shared to comments!', 'success');
    } else {
      showToast('Failed to share', 'error');
    }
  };

  const handleViewRecap = async () => {
    setShowRecap(true);
    setRecapLoading(true);
    if (!recapData) {
      const data = await fetchWeeklyRecap();
      if (data) setRecapData(data);
    }
    setRecapLoading(false);
  };

  const handleShareRecap = async (recap: WeeklyRecapResponse) => {
    const res = await shareWeeklyRecap(recap);
    if (res) {
      showToast('Weekly recap shared to comments!', 'success');
    } else {
      showToast('Failed to share recap', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-amber-50 dark:bg-gray-900">
        <p className="text-amber-600 dark:text-amber-400 text-lg">Loading today's arcade...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-amber-50 dark:bg-gray-900 p-6 gap-4">
        <p className="text-red-500 text-center">{error ?? 'No config available'}</p>
        <p className="text-amber-600 dark:text-amber-400 text-sm text-center">
          This post may be from an older version.<br />
          Create a fresh Story Arcade post to play.
        </p>
        <button
          className="bg-amber-600 text-white px-4 py-2 rounded-full"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  const todayDate = todayStr();
  const isStale = config.date !== todayDate;

  return (
    <div className="min-h-screen bg-amber-50 dark:bg-gray-900 text-amber-900 dark:text-amber-200 pb-12">
      <Toast message={toastMsg} type={toastType} onDismiss={() => setToastMsg(null)} />

      {isStale && (
        <div className="bg-amber-200 dark:bg-amber-800 px-4 py-2 text-center text-sm text-amber-900 dark:text-amber-200 border-b border-amber-300 dark:border-amber-700">
          This is from {config.date}. A new arcade may be available — check the subreddit for today's post.
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
          <div className="text-4xl animate-bounce">🎮</div>
          <div className="space-y-3 w-full max-w-sm">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-amber-100 dark:bg-gray-800 rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-amber-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                <div className="h-4 bg-amber-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
                <div className="h-8 bg-amber-200 dark:bg-gray-700 rounded w-full" />
              </div>
            ))}
          </div>
          <p className="text-sm text-amber-500 dark:text-amber-400">Loading your daily arcade...</p>
        </div>
      )}

      {!loading && (<>

      <div className="sticky top-0 z-10 bg-amber-50/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-amber-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Story Arcade</h1>
          <div className="flex items-center gap-2">
            <MusicToggle isPlaying={music.isPlaying} onToggle={music.toggle} />
            <StreakBar streakDays={config.userStats.streakDays} badges={config.userStats.badges} />
          </div>
        </div>
        <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">{config.date}</p>
        <div className={`mt-1 w-full h-1 bg-amber-100 dark:bg-gray-700 rounded-full overflow-hidden ${progressPct >= 100 ? 'animate-completion-glow rounded-full' : ''}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${progressPct >= 100 ? 'bg-amber-500' : 'bg-amber-400'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {showWelcome && !anyDone && (
          <div className="bg-amber-50 dark:bg-gray-800 rounded-xl p-3 text-center border border-amber-300 dark:border-amber-600 animate-fade-in-up">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Welcome to the Arcade! Pick your mood to start.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Each section reveals community results as you play.
            </p>
          </div>
        )}
        <div className="section-enter" style={{ animationDelay: '0s' }}>
          <MoodSection options={config.mood.options} onSubmit={handleMoodSubmit} />
        </div>
        {config.questions.map((q, qi) => (
          <div key={q.id} className="section-enter" style={{ animationDelay: `${(qi + 1) * 0.1}s` }}>
            <ChoiceSection question={q} onSubmit={handleChoiceSubmit} />
          </div>
        ))}
        <div className="section-enter" style={{ animationDelay: `${(config.questions.length + 1) * 0.1}s` }}>
          <TemplateSection template={config.template} onSubmit={handleTemplateSubmit} />
        </div>
        <div className="section-enter" style={{ animationDelay: `${(config.questions.length + 2) * 0.1}s` }}>
          <ConfessionSection confession={config.confession} onSubmit={handleConfessionSubmit} />
        </div>

        {anyDone && (
          <div className="space-y-4 pt-4 border-t-2 border-amber-200 dark:border-gray-700 animate-fade-in-up">
            <div className="flex items-center gap-2">
              <span className="text-lg">👥</span>
              <h2 className="font-bold text-amber-900 dark:text-amber-200 text-lg">Community Arena</h2>
              <span className="text-xs text-amber-500 dark:text-amber-400">
                {allCompleted ? '— All sections complete!' : '— Play along while you finish'}
              </span>
            </div>
            {communityError ? (
              <div className="text-center py-4 space-y-2">
                <p className="text-sm text-red-500">Failed to load community features.</p>
                <button onClick={retryCommunity} className="text-xs text-amber-600 underline">Retry</button>
              </div>
            ) : (
              <>
                <DailyCanvasSection canvasState={canvasState} onPlacePixel={handlePlacePixel} />
                <HotTakeSection hotTakeState={hotTakeState} onVote={handleHotTakeVote} />
                <HallOfFameSection data={hallOfFameState} loading={hallOfFameLoading} />
                <LiveConfessionsFeed
                  data={confessionFeed}
                  loading={confessionFeedLoading}
                  onSubmit={handleCommunityConfession}
                  submitting={confessionSubmitting}
                />
              </>
            )}
          </div>
        )}

        {allCompleted && !showResults && (
          <button
            onClick={() => setShowResults(true)}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-colors animate-celebrate-burst"
          >
            See Your Results
          </button>
        )}
      </div>

      <div className="fixed bottom-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleSeedDemo}
          disabled={seeding}
          className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-2 rounded-xl shadow font-medium transition-colors"
        >
          {seeding ? 'Seeding...' : 'Seed Demo'}
        </button>
        <button
          className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-full shadow-lg transition-colors"
          onClick={handleViewRecap}
        >
          📊 My Week
        </button>
        <button
          className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-full shadow-lg transition-colors"
          onClick={() => setShowPromptModal(true)}
        >
          + Submit Prompt
        </button>
      </div>

      {showPromptModal && (
        <SubmitPromptModal onClose={() => setShowPromptModal(false)} />
      )}

      {showRecap && (
        <WeeklyRecapCard recap={recapData} loading={recapLoading} onClose={() => setShowRecap(false)} onShare={handleShareRecap} />
      )}

      {showResults && (
        <ResultsCard
          results={{
            mood: moodResult,
            choices: choiceResults,
            template: templateResult,
            confession: confessionResult,
            streakDays: config.userStats.streakDays,
            badges: config.userStats.badges,
          }}
          onShare={handleShare}
          onClose={() => setShowResults(false)}
        />
      )}
    </>)}
    </div>
  );
};
