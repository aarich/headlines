import { GameState, Headline } from '../types';
import { recordShare } from './api';
import { getStoredScores } from './storage';

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

export const shareScore = (
  id: number,
  gameState: GameState,
  isExpert: boolean,
  forceCopy: boolean = false
): void => {
  recordShare(id);

  let expert = isExpert;
  const score = getStoredScores()[`${id}`];
  if (score) {
    expert = score.e;
  }

  const countText = gameState.wrongGuesses.map(() => `❌`).join('') + '✅';

  let hintsText = '';
  gameState.hints?.firstChar && (hintsText += '💡');
  gameState.hints?.clue && (hintsText += '💡');

  hintsText = hintsText.length > 0 ? hintsText : 'No hints! 😎';

  const expertText = expert ? '\nExpert Mode 🤓' : '';

  const shareText = `I found the leek: ${countText}\n${hintsText}${expertText}\n\n${window.location.href}`;

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

export const getNextHint = (headline: Headline, currentGameState: GameState): GameState => {
  if (!currentGameState.hints) {
    return { ...currentGameState, hints: { firstChar: true, clue: false } };
  }
  if (!currentGameState.hints.clue) {
    return { ...currentGameState, hints: { ...currentGameState.hints, clue: true } };
  }
  return currentGameState;
};

export const hasAnyHints = (gameState: GameState): boolean => {
  return !!(gameState.hints?.firstChar || gameState.hints?.clue);
};

export const getNextHintPrompt = (gameState: GameState): string => {
  if (!gameState.hints || !gameState.hints.firstChar) {
    return 'Reveal the first letter of the missing word?';
  }
  if (!gameState.hints.clue) {
    return 'Reveal a clue about the missing word?';
  }
  return '';
};
