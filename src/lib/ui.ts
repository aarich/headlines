import { ToastType } from '../components/Toast';
import { DEFAULT_TOAST_DURATION, ToastFn } from '../contexts/ToastContext';
import { GameState, Headline } from '../types';
import { fetchHeadline, GetHeadlineArgs, recordShare } from './api';
import { getNumCharsBeforeClue } from './game';
import { getStoredScores } from './storage';

export const plural = (count: number, singular: string, suffix = 's'): string =>
  `${singular}${count === 1 ? '' : suffix}`;

export const timeSince = (
  date: Date,
  smallestInterval: 'y' | 'm' | 'd' | 'h' | 'm' | 's' = 's'
): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;

  const fmt = (interval: number, unit: string) => {
    const rounded = Math.round(interval);
    return `${rounded} ${plural(rounded, unit)}`;
  };

  if (interval > 1 || (smallestInterval === 'y' && interval > 0.7)) {
    return fmt(interval, 'year');
  }
  interval = seconds / 2592000;
  if (interval > 1 || (smallestInterval === 'm' && interval > 0.7)) {
    return fmt(interval, 'month');
  }
  interval = seconds / 86400;
  if (interval > 1 || (smallestInterval === 'd' && interval > 0.7)) {
    return fmt(interval, 'day');
  }

  interval = seconds / 3600;
  if (interval > 1 || (smallestInterval === 'h' && interval > 0.7)) {
    return fmt(interval, 'hour');
  }
  interval = seconds / 60;
  if (interval > 1 || (smallestInterval === 'm' && interval > 0.7)) {
    return fmt(interval, 'minute');
  }
  return fmt(seconds, 'second');
};

const toastRandomMessage = (
  toast: ToastFn,
  toastType: ToastType,
  possibleMessages: (string | [string, string])[]
) => {
  const randomIndex = Math.floor(Math.random() * possibleMessages.length);
  const randomMessage = possibleMessages[randomIndex];
  let text = randomMessage;
  let messageClass = undefined;
  if (Array.isArray(randomMessage)) {
    [text, messageClass] = randomMessage;
  } else {
    text = randomMessage;
  }

  toast(text, toastType, DEFAULT_TOAST_DURATION, messageClass);
};

export const toastWrongAnswer = (toast: ToastFn) => {
  toastRandomMessage(toast, 'warning', [
    'Not quite',
    'Nope',
    'Try again',
    'Incorrect',
    'Wrong',
    'Not it',
    'Close, but no cigar',
    "That's not it",
    ['buzzer sounds', 'italic'],
    "Sorry, that's not correct",
    'Not even close',
    'Wrong answer',
    'Not the right answer',
  ]);
};

export const toastRightAnswer = (toast: ToastFn) => {
  toastRandomMessage(toast, 'success', [
    'Correct!',
    'You got it!',
    'Well done!',
    'Great job!',
    'Awesome!',
    'Fantastic!',
    'Excellent!',
    'Bravo!',
    'Superb!',
    'Amazing!',
    'Nice job!',
    'Nice!',
    'Spot on!',
    'Right answer!',
    'You nailed it!',
    ['ding ding ding', 'italic'],
    "That's the one!",
    'Bingo!',
  ]);
};

// https://stackoverflow.com/a/12646864/2612322
export const shuffleArray = (array: unknown[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

/**
 * Checks if the parameter name is in the url
 * - If so, returns the value as a number in an object
 * - If not, returns empty object and removes the param from the URL
 */
const validateNumParameter = <T extends string>(
  urlParams: URLSearchParams,
  name: T
): { [key in T]?: number } => {
  const value = urlParams.get(name);

  if (isNaN(Number(value))) {
    urlParams.delete(name as string);
    window.history.replaceState({}, '', `?${urlParams.toString()}`);
    return {};
  }

  return { [name]: Number(value) } as { [key in T]?: number };
};

export const fetchHeadlineBasedOnQueryParameters = async () => {
  const urlParams = new URLSearchParams(window.location.search);

  const hasId = urlParams.has('id');
  const hasGame = urlParams.has('game');

  if (hasId && hasGame) {
    throw new Error("Unsupported URL. Only one of 'id' or 'game' should be provided.");
  }

  let args: GetHeadlineArgs = {};
  if (hasId) {
    args = validateNumParameter(urlParams, 'id');
  } else if (hasGame) {
    args = validateNumParameter(urlParams, 'game');
  }

  return await fetchHeadline(args);
};

export const getShareScoreText = (headline: Headline, gameState: GameState, isExpert: boolean) => {
  const countText = gameState.wrongGuesses.map(() => `❌`).join('') + '🧅';

  const numCharsBeforeClue = getNumCharsBeforeClue(headline.correctAnswer, isExpert);
  let hintsText = '';
  if (gameState.hints?.chars) {
    for (let i = 0; i < gameState.hints.chars; i++) {
      hintsText += '💡';

      if (i === numCharsBeforeClue - 1 && gameState.hints.clue) {
        hintsText += '🕵';
      }
    }
  }

  hintsText = hintsText.length > 0 ? hintsText : 'No hints! 😎';

  const expertText = isExpert ? '\nExpert Mode 🤓' : '';

  return `I found the leek: ${countText}\n${hintsText}${expertText}\n\n${window.location.href}`;
};

export const shareScore = (
  headline: Headline,
  gameState: GameState,
  isExpert: boolean,
  forceCopy: boolean = false
): void => {
  const score = getStoredScores()[`${headline.id}`];
  const shareText = getShareScoreText(headline, gameState, score?.e || isExpert);

  if (navigator.share && !forceCopy) {
    navigator
      .share({
        title: 'Headline Puzzle Score',
        text: shareText,
      })
      .then(() => recordShare(headline.id))
      .catch(error => error.name !== 'AbortError' && console.error(error));
  } else {
    navigator.clipboard.writeText(shareText);
    alert('Score copied to clipboard!');
  }
};
