import { WrongGuess } from '../types';

const normalizeString = (str: string): string => {
  return str.toLowerCase().trim();
};

const isFuzzyMatch = (guess: string, correct: string): boolean => {
  const normalizedGuess = normalizeString(guess);
  const normalizedCorrect = normalizeString(correct);

  // Exact match
  if (normalizedGuess === normalizedCorrect) return true;

  // Handle plurals
  if (normalizedGuess === normalizedCorrect + 's' || normalizedCorrect === normalizedGuess + 's')
    return true;

  // Handle common verb tenses
  const commonEndings = ['ed', 'ing', 's'];
  const baseGuess = commonEndings.reduce(
    (str, ending) => (str.endsWith(ending) ? str.slice(0, -ending.length) : str),
    normalizedGuess
  );
  const baseCorrect = commonEndings.reduce(
    (str, ending) => (str.endsWith(ending) ? str.slice(0, -ending.length) : str),
    normalizedCorrect
  );

  return baseGuess === baseCorrect;
};

export const checkAnswer = (guess: string, correctAnswer: string, expertMode: boolean): boolean => {
  if (expertMode) {
    return isFuzzyMatch(guess, correctAnswer);
  }
  return guess === correctAnswer;
};

export const calculateNewScore = (currentScore: number, isCorrect: boolean): number => {
  return currentScore + (isCorrect ? 1 : 0);
};

export const calculateNewStreak = (currentStreak: number, isCorrect: boolean): number => {
  return isCorrect ? currentStreak + 1 : 0;
};

export const shareScore = (wrongGuesses: WrongGuess[], forceCopy: boolean = false): void => {
  let countText;
  if (wrongGuesses.length === 0) {
    countText = 'on the first try';
  } else if (wrongGuesses.length === 1) {
    countText = 'after 1 wrong guess';
  } else {
    countText = `after ${wrongGuesses.length} wrong guesses`;
  }
  const shareText = `I Spotted the Leek ${countText}!\n\n${window.location.href}`;

  if (navigator.share && !forceCopy) {
    navigator
      .share({
        title: 'Headline Puzzle Score',
        text: shareText,
      })
      .catch(console.error);
  } else {
    navigator.clipboard.writeText(shareText);
    alert('Score copied to clipboard!');
  }
};
