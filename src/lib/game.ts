import { GameState, Headline, Hint, PlayAction, Score } from 'types';

const normalizeString = (str: string): string => {
  return str.toLowerCase().trim();
};

const isFuzzyMatch = (guess: string, correct: string): boolean => {
  const normalizedGuess = normalizeString(guess);
  const normalizedCorrect = normalizeString(correct);

  // Exact match
  if (normalizedGuess === normalizedCorrect) return true;

  // Handle common verb tenses and plurals
  const commonEndings = ['ed', 'ing', 's', 'd', 'es'];

  const areEqualIgnoringCommonEndings = commonEndings.find(ending => {
    const guessWithoutEnding = normalizedGuess.endsWith(ending)
      ? normalizedGuess.slice(0, -ending.length)
      : normalizedGuess;
    const correctWithoutEnding = normalizedCorrect.endsWith(ending)
      ? normalizedCorrect.slice(0, -ending.length)
      : normalizedCorrect;
    return guessWithoutEnding === correctWithoutEnding;
  });

  return areEqualIgnoringCommonEndings !== undefined;
};

export const checkAnswer = (guess: string, correctAnswer: string, expertMode: boolean): boolean => {
  if (expertMode) {
    return isFuzzyMatch(guess, correctAnswer);
  }
  return guess === correctAnswer;
};

export const getNextHint = (
  headline: Headline,
  { actions = [] }: GameState,
  isExpert: boolean
): PlayAction[] => {
  const nextRevealType = getNextRevealType(actions, headline.correctAnswer, isExpert);

  if (nextRevealType === 'clue') {
    return [...actions, Hint.CLUE];
  }

  if (nextRevealType === 'char') {
    return [...actions, Hint.CHAR];
  }

  // No next hint
  return actions;
};

export const getHints = (gameState: GameState): Hint[] =>
  gameState.actions?.filter(action => typeof action !== 'string') ?? [];

export const countHints = (gameState: GameState): number => getHints(gameState).length;

export const getWrongGuesses = (gameState: GameState): string[] =>
  gameState.actions?.filter(action => typeof action === 'string') ?? [];

export const countWrongGuesses = (gameState: GameState): number =>
  getWrongGuesses(gameState).length;

export const hasAnyHints = (gameState: GameState): boolean =>
  !!gameState.actions?.some(action => typeof action !== 'string');

export const getNumCharsBeforeClue = (correctAnswer: string, isExpert: boolean) =>
  // Expert mode gets char reveals. Non-expert mode gets the clue right away.
  isExpert ? Math.floor(Math.min(correctAnswer.length / 2, 3)) : 0;

export const getNextHintPrompt = (
  { actions }: GameState,
  correctAnswer: string,
  isExpert: boolean
): string => {
  const nextRevealType = getNextRevealType(actions, correctAnswer, isExpert);

  if (nextRevealType === 'char') {
    const numCharsRevealed = actions?.filter(action => action === Hint.CHAR).length ?? 0;
    // Suggest using non-expert mode if the user has already revealed a character and is in expert mode
    const tip =
      isExpert && numCharsRevealed === 2
        ? '\n\nTip: You can also toggle off "Expert Mode" for a different fun experience!'
        : '';
    let next = 'next';

    if (!numCharsRevealed) {
      next = 'first';
    } else if (numCharsRevealed === correctAnswer.length - 1) {
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
  actions: PlayAction[] | undefined,
  correctAnswer: string,
  isExpert: boolean
): 'char' | 'clue' | undefined => {
  // Reveal the next character until 3 chars or half of the word is revealed. Then reveal the clue. Then continue revealing characters.
  const numCharsBeforeClue = getNumCharsBeforeClue(correctAnswer, isExpert);
  if (!actions) {
    return numCharsBeforeClue === 0 ? 'clue' : 'char';
  }

  const chars = actions.filter(play => play === Hint.CHAR).length;
  if (chars < numCharsBeforeClue) {
    return 'char';
  }

  const hasClue = actions.some(play => play === Hint.CLUE);
  if (!hasClue) {
    return 'clue';
  }

  return chars < correctAnswer.length ? 'char' : undefined;
};

/**
 * Return a score out of 100
 */
export const calculateScore = (gameState: GameState, score: Score, headline: Headline) => {
  const { e: isExpert, g: numWrongGuesses } = score;
  const { correctAnswer } = headline;
  const hintsUsed = getHints(gameState);
  const numCharHints = hintsUsed.filter(hint => hint === Hint.CHAR).length;
  const usedClue = hintsUsed.some(hint => hint === Hint.CLUE);

  const charHintPenalty = Math.round((numCharHints / correctAnswer.length) * 100);
  const cluePenalty = usedClue ? 30 : 0;
  const notExpertPenalty = isExpert ? 0 : 10;
  const wrongGuessPenalty = Math.min(numWrongGuesses * 5, 100);

  const overall = Math.round(
    Math.max(100 - charHintPenalty - cluePenalty - notExpertPenalty - wrongGuessPenalty, 0)
  );

  return { overall, charHintPenalty, cluePenalty, notExpertPenalty, wrongGuessPenalty };
};
