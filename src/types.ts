export interface Headline {
  id: number;
  gameNum: number;
  createdAt: string;
  headline: string;
  correctAnswer: string;
  possibleAnswers: string[];
  beforeBlank: string;
  afterBlank: string;
  publishTime: string;
  hint: string;
  articleUrl: string;
  redditUrl: string;
}

export type PreviewHeadlineStatus = 'selected' | 'final_selection' | 'rejected' | 'archived' | null;

export interface PreviewHeadline {
  id: number;
  headline: string;
  beforeBlank: string;
  afterBlank: string;
  hint: string;
  explanation: string;
  articleUrl: string;
  redditUrl: string;
  correctAnswer: string;
  possibleAnswers: string[];
  publishTime: string;
  status: PreviewHeadlineStatus;
  createdAt: string;
  updatedAt: string;
}

export enum Hint {
  CHAR = 1,
  CLUE = 2,
}

export type PlayAction = Hint | string;

export const SUGGESTION_SKIPPED = -1;

export interface GameState {
  actions?: PlayAction[];
  completedAt?: number;
  suggestion?: string | typeof SUGGESTION_SKIPPED;
  /** IDs of suggestions */
  votes?: number[];
}

export interface ScoreData {
  isCorrect: boolean;
  headlineId: number;
}

export type DisplayMode = 'light' | 'dark' | 'system';

export interface Settings {
  expertMode: boolean;
  displayMode: DisplayMode;
  showAnimations: boolean;
  colorBlindMode: boolean;
}

/**
 * short keys since this will be stored in localStorage
 */
export interface Score {
  /** date */
  d: number;
  /** wrong guess count */
  g: number;
  /** expert mode */
  e: boolean;
  /** game number */
  n: number;
}

export type Stat =
  | 'totalPlays'
  | 'totalIncorrectGuesses'
  | 'firstGuessCorrectCount'
  | 'longestStreak';

export type Stats = Record<Stat, number>;

export interface HeadlineHistory {
  id: number;
  gameNum: number;
  createdAt: string;
  headline: string;
  beforeBlank: string;
  afterBlank: string;
  articleUrl: string;
  redditUrl: string;
  correctAnswer: string;
  publishTime: string;
  totalPlays: number;
  totalCorrectGuesses: number;
  totalIncorrectGuesses: number;
  firstGuessCorrectCount: number;
  wrongGuesses: { word: string; count: number }[];
}

export interface Suggestion {
  id: number;
  headlineId: number;
  suggestionText: string;
  votes: number;
  createdAt: string;
}
