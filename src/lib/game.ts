import { GameHints, GameState, Headline } from '../types';
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
  if (gameState.hints?.chars) {
    gameState.hints.chars && (hintsText += '💡');
    gameState.hints.clue && (hintsText += '🕵️‍♂️');
    gameState.hints.chars > 1 && (hintsText += '💡'.repeat(gameState.hints.chars - 1));
  }

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

export const getNextHint = (headline: Headline, { hints }: GameState): GameHints => {
  if (!hints) {
    return { chars: 1, clue: false };
  }

  const nextRevealType = getNextRevealType(hints, headline.correctAnswer);

  if (nextRevealType === 'clue') {
    return { ...hints, clue: true };
  }

  if (nextRevealType === 'char') {
    return { ...hints, chars: hints.chars + 1 };
  }

  return hints;
};

export const hasAnyHints = (gameState: GameState): boolean => {
  return !!(gameState.hints?.chars || gameState.hints?.clue);
};

export const getNextHintPrompt = (
  { hints }: GameState,
  correctAnswer: string,
  isExpert: boolean
): string => {
  const nextRevealType = getNextRevealType(hints, correctAnswer);

  if (nextRevealType === 'char') {
    // Suggest using non-expert mode if the user has already revealed a character and is in expert mode
    const tip =
      isExpert && hints?.chars
        ? '\n\nTip: You can also toggle off "Expert Mode" for a different fun experience!'
        : '';
    let next = 'next';

    if (!hints?.chars) {
      next = 'first';
    } else if (hints.chars === correctAnswer.length - 1) {
      next = 'last';
    }

    return `Reveal the ${next} letter of the missing word?${tip}`;
  }

  if (nextRevealType === 'clue') {
    return 'Reveal a clue about the missing word?';
  }

  return '';
};

export const getNextRevealType = (
  hints: GameHints | undefined,
  correctAnswer: string
): 'char' | 'clue' | undefined => {
  // Reveal the next character until half of the word is revealed. Then reveal the clue. Then continue revealing characters.
  if (!hints || hints.chars < correctAnswer.length / 2) {
    return 'char';
  }

  if (!hints.clue) {
    return 'clue';
  }

  return hints.chars < correctAnswer.length ? 'char' : undefined;
};
