import type { Archetype } from './archetypes';
export type MoodOption = {
  key: string;
  emoji: string;
  label: string;
};

export type ChoiceQuestion = {
  id: string;
  question: string;
  options: { id: string; text: string }[];
};

export type TemplateCell = {
  id: string;
  text: string;
};

export type Template = {
  id: string;
  type: 'bingo' | 'put-a-finger-down';
  title: string;
  cells: TemplateCell[][];
};

export type Confession = {
  id: string;
  text: string;
  tags: string[];
};

export type UserStats = {
  streakDays: number;
  lastPlayedDate: string | null;
  badges: string[];
  roleTier: 'user' | 'moderator' | 'admin';
  /** Archetype ID assigned based on mood patterns (e.g. 'optimist', 'radiant') */
  archetypeId: string;
};

export type DailyConfig = {
  date: string;
  mood: {
    options: MoodOption[];
  };
  questions: ChoiceQuestion[];
  template: Template;
  confession: Confession;
  hotTake: HotTake;
  userStats: UserStats;
  /** Current archetype assignment — computed from recent mood history */
  archetype: Archetype | null;
  playerCount?: number; // FOMO: total unique players today
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};

export type DailyConfigResponse = DailyConfig;

export type MoodSubmitRequest = { moodKey: string };
export type MoodSubmitResponse = { status: 'ok'; aggregate: Record<string, number> };

export type ChoiceSubmitRequest = { questionId: string; optionId: string; customText?: string };
export type ChoiceSubmitResponse = { status: 'ok'; aggregate: Record<string, number> };

export type TemplateSubmitRequest = { templateId: string; cellIds: string[] };
export type TemplateSubmitResponse = { status: 'ok'; score: number; aggregate: Record<string, number> };

export type ConfessionVoteRequest = { confessionId: string; tag: string };
export type ConfessionVoteResponse = { status: 'ok'; majorityTag: string | null; totalVotes: number };

export type PromptSubmitRequest = {
  type: 'choice' | 'template' | 'confession';
  payload: Record<string, unknown>;
};
export type PromptSubmitResponse = { status: 'ok'; id: string };

export type PromptModerateRequest = { submissionId: string; action: 'approve' | 'reject'; reason?: string };
export type PromptModerateResponse = { status: 'ok' };

export type ArcadeResults = {
  mood: { key: string; emoji: string; label: string } | null;
  choices: { questionId: string; question: string; chosenOption: string; optionText: string; pct: number }[];
  template: { score: number; cells: string[] } | null;
  confession: { tag: string | null; majorityTag: string | null; totalVotes: number; text?: string } | null;
  streakDays: number;
  badges: string[];
  pixelPlaced?: { x: number; y: number; color: string } | null;
  hotTakeVote?: 'agree' | 'disagree' | 'unsure' | null;
};

export type ShareCommentRequest = { results: ArcadeResults };
export type ShareCommentResponse = { status: 'ok'; commentId: string };

export type WeeklyRecap = {
  weekEnding: string;
  totalDaysPlayed: number;
  dominantMood: { key: string; emoji: string; label: string; pct: number } | null;
  topChoice: { question: string; chosenSide: string; pct: number } | null;
  avgBingoScore: number;
  confessionMajorityCount: number;
  streakDays: number;
  badges: string[];
  personalityLabel: string;
  /** Archetype ID from the archetype system (e.g. 'optimist', 'radiant') */
  archetypeId: string;
};

export type WeeklyRecapResponse = WeeklyRecap;

export type CanvasPixel = {
  x: number;
  y: number;
  color: string;
};

export type CanvasStateResponse = {
  pixels: CanvasPixel[];
  userPixel: CanvasPixel | null;
  totalPlaced: number;
  date: string;
};

export type CanvasPlaceRequest = {
  x: number;
  y: number;
  color: string;
};

export type CanvasPlaceResponse = {
  status: 'ok';
  pixelCount: number;
};

export type HotTake = {
  id: string;
  statement: string;
};

export type HotTakeVoteCounts = Record<'agree' | 'disagree' | 'unsure', number>;

export type HotTakeStateResponse = {
  hotTake: HotTake;
  voteCounts: HotTakeVoteCounts;
  userVote: 'agree' | 'disagree' | 'unsure' | null;
  totalVotes: number;
  date: string;
};

export type HotTakeVoteRequest = {
  vote: 'agree' | 'disagree' | 'unsure';
};

export type HotTakeVoteResponse = {
  status: 'ok';
  voteCounts: HotTakeVoteCounts;
  totalVotes: number;
};

export type HallOfFameEntry = {
  displayName: string;
  submissionCount: number;
};

export type HallOfFameResponse = {
  entries: HallOfFameEntry[];
  totalContributors: number;
};

export type CommunityConfession = {
  userId: string;
  text: string;
  timestamp: number;
};

export type CommunityConfessionsResponse = {
  confessions: CommunityConfession[];
  total: number;
};

export type PromptSubmissionStatus = 'pending' | 'approved' | 'rejected';

export type MySubmission = {
  id: string;
  userId: string;
  type: 'choice' | 'template' | 'confession';
  payload: Record<string, unknown>;
  status: PromptSubmissionStatus;
  submittedAt: number;
  rejectionReason?: string;
};

export type MySubmissionsResponse = {
  submissions: MySubmission[];
  total: number;
};
