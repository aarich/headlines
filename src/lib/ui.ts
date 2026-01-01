import { ToastType } from 'components/Toast';
import { DEFAULT_TOAST_DURATION, ToastFn } from 'contexts/ToastContext';
import { GameState, Headline, Hint, Score } from 'types';
import { fetchHeadline, GetHeadlineArgs, recordShare } from 'lib/api';
import { calculateScore } from 'lib/game';

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

const randomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const toastRandomMessage = (
  toast: ToastFn,
  toastType: ToastType,
  possibleMessages: (string | [string, string])[]
) => {
  const randomMessage = randomElement(possibleMessages);
  let text = randomMessage;
  let messageClass = undefined;
  if (Array.isArray(randomMessage)) {
    [text, messageClass] = randomMessage;
  } else {
    text = randomMessage;
  }

  toast(text, toastType, DEFAULT_TOAST_DURATION, messageClass);
};

export const toastSuccessfulSuggestion = (toast: ToastFn) => {
  const confirmations = ['Submitted', 'Sent', 'Got it', 'Received'];
  const affirmations = [
    'Thanks for the laugh!',
    'Good one.',
    'Very funny indeed',
    'Made me chuckle.',
    'That was a good one!',
    'Your humor is appreciated.',
    'Keep the funny ideas coming!',
    'That was clever.',
    "You're a comedy genius!",
    'Very witty!',
    'Thanks for contributing!',
    'We got a real comedian here',
    'Clever one, Seinfeld',
    "You're a star.",
    "Mic drop, I'm sure",
  ];
  const punctuations = ['.', '!'];
  const messages = confirmations.flatMap(c =>
    punctuations.flatMap(p => affirmations.map(a => `${c}${p} ${a}`))
  );

  toastRandomMessage(toast, 'success', messages);
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
    'Wrongaroo',
    'Incorrect guess',
    'Not the one',
    'Guess again',
    'Nope, not that',
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
  // First check if the url is like xxx.com/###
  const url = new URL(window.location.href);
  if (url.pathname.length > 1) {
    const game = Number(url.pathname.slice(1));
    if (!isNaN(game)) {
      return await fetchHeadline({ game });
    }
  }

  // Second: check the query params
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

const EMOJIS = {
  [Hint.CHAR]: '💡',
  [Hint.CLUE]: '🕵',
};

export const getActionsText = (gameState: GameState) => {
  let text =
    gameState.actions
      ?.map(action => (typeof action === 'string' ? '❌' : EMOJIS[action]))
      .join('') || '';
  if (gameState.completedAt) {
    text += '🧅';
  }
  return text;
};

const LEVEL_EMOJIS = [
  ['🎉', '🥳', '🏆', '💯', '🥇', '👑', '🚀', '🔥', '🎊', '💰', '📈'],
  ['🤩', '🤓', '😇', '😊'],
  ['🙂'],
  ['🙃', '🫠'],
  ['🤔', '🤨', '😒', '🙄'],
  ['😫', '🥴'],
  '🙈',
  '😵',
  '🪦',
  '💩',
  '💀',
];

export const getResultText = (
  headline: Headline,
  gameState: GameState,
  score: Score | undefined, // Score could be undefined if something went wrong with storage
  levels = LEVEL_EMOJIS // for testing
) => {
  let resultsText = getActionsText(gameState);

  if (score) {
    const scores = calculateScore(gameState, score, headline);
    const level = Math.ceil((100 - scores.overall) / levels.length);
    const emojis = levels[level];
    const emoji = Array.isArray(emojis) ? randomElement(emojis) : emojis;

    resultsText += `\nScore: ${scores.overall}/100 ${emoji}`;
  }

  return resultsText;
};

export const shareScore = (
  resultsText: string,
  headline: Headline,
  toast: ToastFn,
  forceCopy: boolean = false
): void => {
  const blankedHeadline = headline.beforeBlank + '[???]' + headline.afterBlank;
  const shareText = `Leek #${headline.gameNum} found: ${blankedHeadline}\n\n${window.location.href}\n\n${resultsText}`;

  if (navigator.share && !forceCopy) {
    navigator
      .share({ text: shareText })
      .then(() => recordShare(headline.id))
      .catch(error => error.name !== 'AbortError' && console.error(error));
  } else {
    navigator.clipboard.writeText(shareText);
    toast('Score copied to clipboard!', 'success');
  }
};

export const formatSuggestionCasing = (text: string, correctAnswer: string): string => {
  if (!text.length || !correctAnswer.length) {
    return text;
  }

  const hasLetter = (str: string) => /[a-zA-Z]/.test(str);
  const isAllUpper = (str: string) => hasLetter(str) && str === str.toUpperCase();

  if (isAllUpper(correctAnswer)) {
    return text.toUpperCase();
  }

  if (/[A-Z]/.test(correctAnswer[0])) {
    return text.charAt(0).toUpperCase() + (text.length > 1 ? text.slice(1).toLowerCase() : '');
  }

  // If correctAnswer is all lowercase, make text all lowercase.
  const isAllLower = (str: string) => hasLetter(str) && str === str.toLowerCase();
  if (isAllLower(correctAnswer)) {
    return text.toLowerCase();
  }

  return text; // Return as is for other cases (e.g. "iPhone", or if correctAnswer is "word1")
};

/**
 * Extracts the parts of a headline that appear before and after a blank space
 * to separate any leading/trailing punctuation as prefixes or suffixes.
 *
 * Example: `initialBeforeBlank` is 'What is "' and `initialAfterBlank` is '"? Find out now',
 * will return:
 *   beforeBlank: 'What is'
 *   prefix: '"'
 *   afterBlank: 'Find out now'
 *   suffix: '"?'
 */
export const extractHeadlineParts = (initialBeforeBlank: string, initialAfterBlank: string) => {
  let beforeBlank = initialBeforeBlank;
  let afterBlank = initialAfterBlank;
  let prefix = '';
  let suffix = '';
  const boundaryRegex = /\S/;

  // Iterate backwards from the end of initialBeforeBlank to find the start of the prefix
  let prefixEndIndex = beforeBlank.length - 1;
  while (prefixEndIndex > 0 && boundaryRegex.test(beforeBlank[prefixEndIndex])) {
    prefixEndIndex--;
  }

  // Iterate forwards from the start of initialAfterBlank to find the end of the suffix
  let suffixStartIndex = 0;
  while (suffixStartIndex < afterBlank.length && boundaryRegex.test(afterBlank[suffixStartIndex])) {
    suffixStartIndex++;
  }

  prefix = beforeBlank.slice(prefixEndIndex).trim();
  beforeBlank = beforeBlank.slice(0, prefixEndIndex).trim();
  suffix = afterBlank.slice(0, suffixStartIndex).trim();
  afterBlank = afterBlank.slice(suffixStartIndex).trim();

  return { beforeBlank, afterBlank, prefix, suffix };
};

/**
 * The date is only shown if it's from a day before today.
 * @param createdAt The date string in "YYYY-MM-DD HH:MM:SS" format.
 * @returns A formatted date string (e.g., "July 10, 2025") or null.
 */
export const formatGameDateForHeader = (createdAt?: string): string | null => {
  if (!createdAt) {
    return null;
  }
  // Handles "YYYY-MM-DD HH:MM:SS" format, assuming it's in local time.
  const gameDate = new Date(createdAt.replace(' ', 'T'));

  const today = new Date();
  // Set today to the beginning of the day in local time.
  today.setHours(0, 0, 0, 0);

  // We only want to show the date if the game date is before the start of today.
  if (gameDate.getTime() < today.getTime()) {
    return gameDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return null;
};

export const MODAL_CLOSE_LISTENERS = new Set<() => void>();
