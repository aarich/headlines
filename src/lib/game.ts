import { GameState, Headline, Hint, Score } from 'types';

export const CLUE_PENALTY = 10;
export const WRONG_GUESS_PENALTY = 3;
export const NON_EXPERT_PENALTY = 10;

const normalizeString = (str: string): string => {
  return str.toLowerCase().trim();
};

export const checkAnswer = (guess: string, correct: string): boolean => {
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

export const getHints = (gameState: GameState, hintType?: Hint): Hint[] =>
  (gameState.actions ?? [])
    .filter(action => typeof action !== 'string')
    .filter(hint => hintType === undefined || hint === hintType);

export const countHints = (gameState: GameState): number => getHints(gameState).length;

export const getWrongGuesses = (gameState: GameState): string[] =>
  gameState.actions?.filter(action => typeof action === 'string') ?? [];

export const countWrongGuesses = (gameState: GameState): number =>
  getWrongGuesses(gameState).length;

export const hasAnyHints = (gameState: GameState): boolean =>
  !!gameState.actions?.some(action => typeof action !== 'string');

export const getHintPrompt = (
  { actions }: GameState,
  correctAnswer: string,
  nextRevealType: Hint
): string => {
  if (nextRevealType === Hint.CHAR) {
    const numCharsRevealed = actions?.filter(action => action === Hint.CHAR).length ?? 0;

    let next = 'next';

    if (!numCharsRevealed) {
      next = 'first';
    } else if (numCharsRevealed === correctAnswer.length - 1) {
      next = 'last';
    }

    return `Reveal the ${next} letter of the missing word?`;
  }

  if (nextRevealType === Hint.CLUE) {
    return 'Reveal a clue about the missing word?';
  }

  return '';
};

export const isHintAvailable = (
  isExpert: boolean,
  gameState: GameState,
  headline: Headline,
  hintType: Hint
) => {
  switch (hintType) {
    case Hint.CHAR:
      // CHAR hint is available if there are fewer char hints than the length of the answer
      return isExpert && getHints(gameState, Hint.CHAR).length < headline.correctAnswer.length;
    case Hint.CLUE:
      // CLUE hint is available if it hasn't been given yet
      return !getHints(gameState, Hint.CLUE).length;
    default:
      throw new Error('Invalid hint type: ' + hintType);
  }
};

/**
 * CLUE: CLUE_PENALTY
 * CHAR: 100/min(answer length, 6)
 */
export const getHintPenalty = ({ correctAnswer }: Headline, hintType: Hint) =>
  hintType === Hint.CHAR ? Math.round(100 / Math.min(correctAnswer.length, 6)) : CLUE_PENALTY;

/**
 * Return a score out of 100
 */
export const calculateScore = (gameState: GameState, score: Score, headline: Headline) => {
  const { e: isExpert, g: numWrongGuesses } = score;
  const hintsUsed = getHints(gameState);
  const numCharHints = hintsUsed.filter(hint => hint === Hint.CHAR).length;
  const usedClue = hintsUsed.some(hint => hint === Hint.CLUE);

  const charHintPenalty = numCharHints * getHintPenalty(headline, Hint.CHAR);
  const cluePenalty = usedClue ? getHintPenalty(headline, Hint.CLUE) : 0;
  const notExpertPenalty = isExpert ? 0 : NON_EXPERT_PENALTY;
  const wrongGuessPenalty = Math.min(numWrongGuesses * WRONG_GUESS_PENALTY, 100);

  const overall = Math.round(
    Math.max(100 - charHintPenalty - cluePenalty - notExpertPenalty - wrongGuessPenalty, 0)
  );

  return { overall, charHintPenalty, cluePenalty, notExpertPenalty, wrongGuessPenalty };
};
