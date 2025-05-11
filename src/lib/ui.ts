import { ToastType } from '../components/Toast';
import { DEFAULT_TOAST_DURATION, ToastFn } from '../contexts/ToastContext';

export const plural = (count: number, singular: string, suffix = 's'): string =>
  `${singular}${count === 1 ? '' : suffix}`;

export const timeSince = (
  date: Date,
  smallestInterval: 'y' | 'm' | 'd' | 'h' | 'm' | 's' = 's'
): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;

  if (interval > 1 || (smallestInterval === 'y' && interval > 0.7)) {
    return Math.floor(interval) + ' years';
  }
  interval = seconds / 2592000;
  if (interval > 1 || (smallestInterval === 'm' && interval > 0.7)) {
    return Math.floor(interval) + ' months';
  }
  interval = seconds / 86400;
  if (interval > 1 || (smallestInterval === 'd' && interval > 0.7)) {
    return Math.floor(interval) + ' days';
  }

  interval = seconds / 3600;
  if (interval > 1 || (smallestInterval === 'h' && interval > 0.7)) {
    return Math.floor(interval) + ' hours';
  }
  interval = seconds / 60;
  if (interval > 1 || (smallestInterval === 'm' && interval > 0.7)) {
    return Math.floor(interval) + ' m';
  }
  return Math.floor(seconds) + ' s';
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
