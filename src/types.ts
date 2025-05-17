export interface Headline {
  id: number;
  gameNum: number;
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

export type PreviewHeadlineStatus = 'selected' | 'final_selection' | 'rejected' | null;

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

export interface GameHints {
  chars: number;
  clue: boolean;
}

export interface GameState {
  correct: boolean;
  wrongGuesses: WrongGuess[];
  hints?: GameHints;
  completedAt?: number;
}

export interface WrongGuess {
  guess: string;
  timestamp: number;
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
