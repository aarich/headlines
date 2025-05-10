import { Feedback, Headline, WrongGuess } from '../types';
import { recordShare } from './api';

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

export const shareScore = (id: number, feedback: Feedback, forceCopy: boolean = false): void => {
  recordShare(id);

  const countText = feedback.wrongGuesses.map(() => `❌`).join('') + '✅';

  let hintsText = '';
  feedback.hintCharCount && (hintsText += '💡');
  feedback.hintFirstChar && (hintsText += '💡');
  feedback.hintText && (hintsText += '💡');

  hintsText = hintsText.length > 0 ? hintsText : 'No hints! 😎';

  const shareText = `I Spotted the Leek\n\n${countText}\n${hintsText}\n\n${window.location.href}`;

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

export const getNextHint = (headline: Headline, currentFeedback: Feedback): Feedback => {
  if (!currentFeedback.hintCharCount) {
    return { ...currentFeedback, hintCharCount: headline.correctAnswer.length };
  }
  if (!currentFeedback.hintFirstChar) {
    return { ...currentFeedback, hintFirstChar: headline.correctAnswer[0] };
  }
  if (!currentFeedback.hintText) {
    return { ...currentFeedback, hintText: headline.hint };
  }
  return currentFeedback;
};

export const hasAnyHints = (feedback: Feedback): boolean => {
  return !!(feedback.hintCharCount || feedback.hintFirstChar || feedback.hintText);
};

export const getNextHintPrompt = (currentFeedback: Feedback): string => {
  if (!currentFeedback.hintCharCount) {
    return 'Reveal the length of the missing word?';
  }
  if (!currentFeedback.hintFirstChar) {
    return 'Reveal the first letter of the missing word?';
  }
  if (!currentFeedback.hintText) {
    return 'Reveal a description of the missing word?';
  }
  return '';
};
