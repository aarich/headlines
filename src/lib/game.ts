import { GameHints, GameState, Headline } from '../types';

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

export const getNextHint = (
  headline: Headline,
  { hints }: GameState,
  isExpert: boolean
): GameHints => {
  let oldHints = hints ?? { clue: false, chars: 0 };

  const nextRevealType = getNextRevealType(hints, headline.correctAnswer, isExpert);

  if (nextRevealType === 'clue') {
    return { ...oldHints, clue: true };
  }

  if (nextRevealType === 'char') {
    return { ...oldHints, chars: oldHints.chars + 1 };
  }

  // No next hint
  return oldHints;
};

export const hasAnyHints = (gameState: GameState): boolean =>
  !!(gameState.hints?.chars || gameState.hints?.clue);

export const getNumCharsBeforeClue = (correctAnswer: string, isExpert: boolean) =>
  // Expert mode gets char reveals. Non-expert mode gets the clue right away.
  isExpert ? Math.floor(Math.min(correctAnswer.length / 2, 3)) : 0;

export const getNextHintPrompt = (
  { hints }: GameState,
  correctAnswer: string,
  isExpert: boolean
): string => {
  const nextRevealType = getNextRevealType(hints, correctAnswer, isExpert);

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
  correctAnswer: string,
  isExpert: boolean
): 'char' | 'clue' | undefined => {
  // Reveal the next character until 3 chars or half of the word is revealed. Then reveal the clue. Then continue revealing characters.
  const numCharsBeforeClue = getNumCharsBeforeClue(correctAnswer, isExpert);
  if (!hints) {
    return numCharsBeforeClue === 0 ? 'clue' : 'char';
  }

  if (hints.chars < numCharsBeforeClue) {
    return 'char';
  }

  if (!hints.clue) {
    return 'clue';
  }

  return hints.chars < correctAnswer.length ? 'char' : undefined;
};
