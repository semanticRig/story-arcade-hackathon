import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useDailyConfig } from '../hooks/useDailyConfig';
import { usePolling } from '../hooks/usePolling';
import { useCountdown } from '../hooks/useCountdown';
import { StreakBar } from './StreakBar';
import { MoodSection } from './MoodSection';
import { ChoiceSection } from './ChoiceSection';
import { TemplateSection } from './TemplateSection';
import { ConfessionSection } from './ConfessionSection';
import { SubmitPromptModal } from './SubmitPromptModal';
import { PromptHistoryModal } from './PromptHistoryModal';
import { Toast } from './Toast';
import { ResultsCard } from './ResultsCard';
import { DailyCanvasSection } from './DailyCanvasSection';
import { HotTakeSection } from './HotTakeSection';
import { WeeklyRecapCard } from './WeeklyRecapCard';
import { MusicToggle } from './MusicToggle';
import { useArcadeMusic } from '../hooks/useArcadeMusic';
import { HallOfFameSection } from './HallOfFameSection';
import { LiveConfessionsFeed } from './LiveConfessionsFeed';
import { ArchetypeCard } from './ArchetypeCard';
import type { ArcadeResults, CanvasStateResponse, CommunityConfessionsResponse, HallOfFameResponse, HotTakeStateResponse, MySubmissionsResponse, WeeklyRecapResponse } from '../../shared/api';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const DailyArcadeScreen = () => {
  const { config, loading, error, lastSubmitError, submitMood, submitChoice, submitTemplate, submitConfessionVote, shareResults, fetchCanvas, placePixel, fetchHotTake, submitHotTakeVote, fetchWeeklyRecap, shareWeeklyRecap, fetchHallOfFame, submitConfession, fetchConfessionFeed, fetchMySubmissions, seedDemo } = useDailyConfig();
  const music = useArcadeMusic();
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showMySubmissions, setShowMySubmissions] = useState(false);
  const [mySubmissionsData, setMySubmissionsData] = useState<MySubmissionsResponse | null>(null);
  const [mySubmissionsLoading, setMySubmissionsLoading] = useState(false);
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
  const [streakGlow, setStreakGlow] = useState(false);
  const [canvasDelta, setCanvasDelta] = useState<number | null>(null);
  const canvasDeltaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevTotalPlaced = useRef<number>(0);
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
      showToast(lastSubmitError.current ?? 'Failed to submit mood', lastSubmitError.current ? 'info' : 'error');
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
      showToast(lastSubmitError.current ?? 'Failed to submit choice', lastSubmitError.current ? 'info' : 'error');
    }
    return res;
  }, [config, submitChoice]);

  const handleTemplateSubmit = useCallback(async (templateId: string, cellIds: string[]) => {
    const res = await submitTemplate(templateId, cellIds);
    if (res) {
      setTemplateResult({ score: res.score, cells: cellIds });
    } else {
      showToast(lastSubmitError.current ?? 'Failed to submit bingo', lastSubmitError.current ? 'info' : 'error');
    }
    return res;
  }, [submitTemplate]);

  const handleConfessionSubmit = useCallback(async (confessionId: string, tag: string) => {
    const res = await submitConfessionVote(confessionId, tag);
    if (res) {
      setConfessionResult({ tag, majorityTag: res.majorityTag, totalVotes: res.totalVotes, ...(config?.confession.text ? { text: config.confession.text } : {}) });
    } else {
      showToast(lastSubmitError.current ?? 'Failed to submit confession tag', lastSubmitError.current ? 'info' : 'error');
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

  // R1 Brain: Live polling for community sections — canvas every 8s, hot take every 10s
  // Previously fetched once on reveal, now feels alive with real-time updates
  const communityLoaded = useRef(false);
  const pollingEnabled = anyDone && !communityError;

  usePolling(async () => {
    const c = await fetchCanvas();
    if (c) {
      if (prevTotalPlaced.current > 0 && c.totalPlaced > prevTotalPlaced.current) {
        const delta = c.totalPlaced - prevTotalPlaced.current;
        setCanvasDelta(delta);
        if (canvasDeltaTimer.current) clearTimeout(canvasDeltaTimer.current);
        canvasDeltaTimer.current = setTimeout(() => setCanvasDelta(null), 4000);
      }
      prevTotalPlaced.current = c.totalPlaced;
      setCanvasState(c);
      if (!communityLoaded.current) communityLoaded.current = true;
    } else if (!communityLoaded.current) {
      // Only show error if we've never successfully loaded
      // (polling handles transient failures silently)
    }
  }, 8000, pollingEnabled);

  usePolling(async () => {
    const h = await fetchHotTake();
    if (h) setHotTakeState(h);
  }, 10000, pollingEnabled);

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
  const streakBadgeKeys = useMemo(() => ['3-day', '7-day', '30-day'], []);
  useEffect(() => {
    if (config?.userStats.badges) {
      const newBadges = config.userStats.badges.filter(b => !prevBadges.current.includes(b));
      if (newBadges.length > 0) {
        const badgeNames: Record<string, string> = { '3-day': '3-Day Streak', '7-day': '7-Day Streak', '30-day': '30-Day Streak' };
        const names = newBadges.map(b => badgeNames[b] ?? b).join(', ');
        showToast(`Badge unlocked: ${names}`, 'success');
        const earnedStreakMilestone = newBadges.find(b => streakBadgeKeys.includes(b));
        if (earnedStreakMilestone) {
          const particleCounts: Record<string, number> = { '3-day': 80, '7-day': 150, '30-day': 300 };
          confetti({
            particleCount: particleCounts[earnedStreakMilestone] ?? 150,
            spread: 70,
            origin: { y: 0.6 },
          });
          setStreakGlow(true);
          setTimeout(() => setStreakGlow(false), 1200);
        }
      }
      prevBadges.current = config.userStats.badges;
    }
  }, [config?.userStats.badges, streakBadgeKeys]);

  // First day completion confetti
  const prevAllCompleted = useRef(false);
  useEffect(() => {
    if (allCompleted && !prevAllCompleted.current && moodResult !== null) {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#fbbf24', '#f59e0b', '#d97706', '#fde68a'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6, x: 0.3 },
        });
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6, x: 0.7 },
        });
      }, 600);
    }
    prevAllCompleted.current = allCompleted;
  }, [allCompleted, moodResult]);

  const handleViewMySubmissions = async () => {
    setShowMySubmissions(true);
    setMySubmissionsLoading(true);
    if (!mySubmissionsData) {
      const data = await fetchMySubmissions();
      if (data) setMySubmissionsData(data);
    }
    setMySubmissionsLoading(false);
  };

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
      showToast(lastSubmitError.current ?? 'Failed to submit confession', lastSubmitError.current ? 'info' : 'error');
    }
    setConfessionSubmitting(false);
  };

  const retryCommunity = () => {
    setCommunityError(false);
    setCanvasState(null);
    setHotTakeState(null);
    prevTotalPlaced.current = 0;
    setCanvasDelta(null);
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
    showToast(lastSubmitError.current ?? 'Failed to submit vote', lastSubmitError.current ? 'info' : 'error');
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

  const todayDate = todayStr();
  const midnightUTC = useMemo(() => {
    const d = new Date(todayDate + 'T00:00:00.000Z');
    d.setUTCDate(d.getUTCDate() + 1);
    return d;
  }, [todayDate]);
  const { hours, minutes, seconds, isExpired } = useCountdown(midnightUTC);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const countdownLabel = isExpired ? 'A new arcade is here!' : `Next arcade in ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

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

  const isStale = config.date !== todayDate;

  return (
    <div className="min-h-screen bg-amber-50 dark:bg-gray-900 text-amber-900 dark:text-amber-200 pb-12">
      <Toast message={toastMsg} type={toastType} onDismiss={() => setToastMsg(null)} />

      {isStale && (
        <div className="bg-amber-200 dark:bg-amber-800 px-4 py-2 text-center text-sm text-amber-900 dark:text-amber-200 border-b border-amber-300 dark:border-amber-700 flex items-center justify-center gap-3 flex-wrap">
          <span>This is from {config.date}. A new arcade may be available.</span>
          <button
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded-full font-medium transition-colors active:scale-95"
            onClick={() => window.location.reload()}
          >
            Play Today's Arcade
          </button>
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
            <StreakBar streakDays={config.userStats.streakDays} badges={config.userStats.badges} glow={streakGlow} />
          </div>
        </div>
        <p className="text-xs text-amber-500 dark:text-amber-400 mt-1">
          {config.date}
          {config.playerCount != null && config.playerCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-800/50 rounded-full px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
              {config.playerCount} {config.playerCount === 1 ? 'player' : 'players'} today
            </span>
          )}
        </p>
        <p className="text-[10px] text-amber-500/70 dark:text-amber-400/70 mt-0.5 font-mono">
          {countdownLabel}
        </p>
        <div className={`mt-1 w-full h-1 bg-amber-100 dark:bg-gray-700 rounded-full overflow-hidden ${progressPct >= 100 ? 'animate-completion-glow rounded-full' : ''}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${progressPct >= 100 ? 'bg-amber-500' : 'bg-amber-400'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Archetype Card — identity widget */}
        {config.archetype && (
          <div className="px-4 pt-2 pb-0">
            <ArchetypeCard
              archetype={config.archetype}
              streakDays={config.userStats.streakDays}
              daysPlayed={(() => {
                // Count how many days the user has played from config date
                // Use a simple heuristic: if streakDays > 0, assume at least streakDays days played
                // The actual count comes from server computation but we approximate here
                return Math.max(config.userStats.streakDays, 1);
              })()}
            />
          </div>
        )}
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
              {canvasState && canvasState.totalPlaced > 0 && (
                <span className="inline-flex items-center gap-1.5 ml-1 bg-amber-100 dark:bg-amber-800/50 rounded-full px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-glow" />
                  {canvasState.totalPlaced} pixels placed
                </span>
              )}
              {canvasDelta != null && canvasDelta > 0 && (
                <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-800/30 rounded-full px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-300 animate-pop-in">
                  +{canvasDelta} new
                </span>
              )}
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
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-colors animate-celebrate-burst animate-celebrate-pulse btn-results-glow active:scale-95"
          >
            See Your Results
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap border-t border-amber-200 dark:border-gray-700 pt-4 mt-4">
        <button
          onClick={handleSeedDemo}
          disabled={seeding}
          className="bg-gray-600 hover:bg-gray-700 text-white text-xs px-3 py-2 rounded-xl shadow font-medium transition-colors active:scale-95"
        >
          {seeding ? 'Seeding...' : 'Seed Demo'}
        </button>
        <button
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-2 rounded-full shadow transition-colors active:scale-95"
          onClick={handleViewRecap}
        >
          📊 My Week
        </button>
        <button
          className="bg-amber-300 hover:bg-amber-400 text-amber-900 text-xs px-3 py-2 rounded-full shadow transition-colors active:scale-95"
          onClick={handleViewMySubmissions}
        >
          My Submissions
        </button>
        <button
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-2 rounded-full shadow transition-colors active:scale-95"
          onClick={() => setShowPromptModal(true)}
        >
          + Submit Prompt
        </button>
      </div>

      {showPromptModal && (
        <SubmitPromptModal onClose={() => setShowPromptModal(false)} />
      )}

      {showMySubmissions && (
        <PromptHistoryModal
          data={mySubmissionsData}
          loading={mySubmissionsLoading}
          onClose={() => setShowMySubmissions(false)}
        />
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
