export interface Headline {
  // Headline info
  id: number;
  headline: string;
  correctAnswer: string;
  possibleAnswers: string[];
  beforeBlank: string;
  afterBlank: string;
  publishTime: string;
  hint: string;
  articleUrl: string;
  redditUrl: string;

  // Public stats
  totalPlays: number;
  totalCorrectGuesses: number;
  totalIncorrectGuesses: number;
  firstGuessCorrectCount: number;
  mostCommonIncorrectGuesses: string[];
}

export interface Feedback {
  correct: boolean;
  wrongGuesses: WrongGuess[];
  hintCharCount?: number;
  hintFirstChar?: string;
  hintText?: string;
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
  /** id */
  i: number;
}

export type Stat =
  | 'totalPlays'
  | 'totalIncorrectGuesses'
  | 'firstGuessCorrectCount'
  | 'longestStreak';

export type Stats = Record<Stat, number>;

export interface HeadlineHistory {
  id: number;
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
