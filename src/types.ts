export interface Headline {
  id: number;
  headline: string;
  articleUrl: string;
  correctAnswer: string;
  possibleAnswers: string[];
  beforeBlank: string;
  afterBlank: string;
  publishTime: string;
  hint: string;
}

export interface Feedback {
  correct: boolean;
  wrongGuesses: WrongGuess[];
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
